/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_sidebar.scss';
import { throttle } from 'lodash';
import React, { useCallback, useEffect, useState, useMemo, useRef, memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiNotificationBadge,
  EuiPageSideBar,
  useResizeObserver,
} from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';

import { isEqual, sortBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { FIELDS_LIMIT_SETTING } from '../../../../../common';
import { groupFields } from './lib/group_fields';
import {
  IndexPatternField,
  indexPatterns as indexPatternUtils,
} from '../../../../../../data/public';
import { getDetails } from './lib/get_details';
import { FieldFilterState, getDefaultFieldFilter, setFieldFilterProp } from './lib/field_filter';
import { getIndexPatternFieldList } from './lib/get_index_pattern_field_list';
import { DiscoverSidebarResponsiveProps } from './discover_sidebar_responsive';
import { DiscoverIndexPatternManagement } from './discover_index_pattern_management';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { ElasticSearchHit } from '../../../../types';

/**
 * Default number of available fields displayed and added on scroll
 */
const FIELDS_PER_PAGE = 50;

export interface DiscoverSidebarProps extends Omit<DiscoverSidebarResponsiveProps, 'documents$'> {
  /**
   * Current state of the field filter, filtering fields by name, type, ...
   */
  fieldFilter: FieldFilterState;
  /**
   * Change current state of fieldFilter
   */
  setFieldFilter: (next: FieldFilterState) => void;

  /**
   * Callback to close the flyout if sidebar is rendered in a flyout
   */
  closeFlyout?: () => void;

  /**
   * Pass the reference to field editor component to the parent, so it can be properly unmounted
   * @param ref reference to the field editor component
   */
  setFieldEditorRef?: (ref: () => void | undefined) => void;

  editField: (fieldName?: string) => void;

  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts?: Record<string, number>;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  documents?: ElasticSearchHit[];
  /**
   * Discover view mode
   */
  viewMode: VIEW_MODE;
}

export function DiscoverSidebarComponent({
  alwaysShowActionButtons = false,
  columns,
  fieldCounts,
  fieldFilter,
  documents,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  services,
  setFieldFilter,
  trackUiMetric,
  useNewFieldsApi = false,
  useFlyout = false,
  onEditRuntimeField,
  onChangeIndexPattern,
  setFieldEditorRef,
  closeFlyout,
  editField,
  viewMode,
}: DiscoverSidebarProps) {
  const [fields, setFields] = useState<IndexPatternField[] | null>(null);

  const { indexPatternFieldEditor } = services;
  const indexPatternFieldEditPermission =
    indexPatternFieldEditor?.userPermissions.editIndexPattern();
  const canEditIndexPatternField = !!indexPatternFieldEditPermission && useNewFieldsApi;
  const [scrollContainer, setScrollContainer] = useState<Element | null>(null);
  const [fieldsToRender, setFieldsToRender] = useState(FIELDS_PER_PAGE);
  const [fieldsPerPage, setFieldsPerPage] = useState(FIELDS_PER_PAGE);
  const availableFieldsContainer = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (documents) {
      const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
      setFields(newFields);
    }
  }, [selectedIndexPattern, fieldCounts, documents]);

  const scrollDimensions = useResizeObserver(scrollContainer);

  const onChangeFieldSearch = useCallback(
    (field: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilter, field, value);
      setFieldFilter(newState);
      setFieldsToRender(fieldsPerPage);
    },
    [fieldFilter, setFieldFilter, setFieldsToRender, fieldsPerPage]
  );

  const getDetailsByField = useCallback(
    (ipField: IndexPatternField) => getDetails(ipField, documents, columns, selectedIndexPattern),
    [documents, columns, selectedIndexPattern]
  );

  const popularLimit = useMemo(
    () => services.uiSettings.get(FIELDS_LIMIT_SETTING),
    [services.uiSettings]
  );

  const {
    selected: selectedFields,
    popular: popularFields,
    unpopular: unpopularFields,
  } = useMemo(
    () => groupFields(fields, columns, popularLimit, fieldCounts, fieldFilter, useNewFieldsApi),
    [fields, columns, popularLimit, fieldCounts, fieldFilter, useNewFieldsApi]
  );

  const paginate = useCallback(() => {
    const newFieldsToRender = fieldsToRender + Math.round(fieldsPerPage * 0.5);
    setFieldsToRender(Math.max(fieldsPerPage, Math.min(newFieldsToRender, unpopularFields.length)));
  }, [setFieldsToRender, fieldsToRender, unpopularFields, fieldsPerPage]);

  useEffect(() => {
    if (scrollContainer && unpopularFields.length && availableFieldsContainer.current) {
      const { clientHeight, scrollHeight } = scrollContainer;
      const isScrollable = scrollHeight > clientHeight; // there is no scrolling currently
      const allFieldsRendered = fieldsToRender >= unpopularFields.length;

      if (!isScrollable && !allFieldsRendered) {
        // Not all available fields were rendered with the given fieldsPerPage number
        // and no scrolling is available due to the a high zoom out factor of the browser
        // In this case the fieldsPerPage needs to be adapted
        const fieldsRenderedHeight = availableFieldsContainer.current.clientHeight;
        const avgHeightPerItem = Math.round(fieldsRenderedHeight / fieldsToRender);
        const newFieldsPerPage = Math.round(clientHeight / avgHeightPerItem) + 10;
        if (newFieldsPerPage >= FIELDS_PER_PAGE && newFieldsPerPage !== fieldsPerPage) {
          setFieldsPerPage(newFieldsPerPage);
          setFieldsToRender(newFieldsPerPage);
        }
      }
    }
  }, [
    fieldsPerPage,
    scrollContainer,
    unpopularFields,
    fieldsToRender,
    setFieldsPerPage,
    setFieldsToRender,
    scrollDimensions,
  ]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
      const nearBottom = scrollTop + clientHeight > scrollHeight * 0.9;
      if (nearBottom && unpopularFields) {
        paginate();
      }
    }
  }, [paginate, scrollContainer, unpopularFields]);

  const fieldTypes = useMemo(() => {
    const result = ['any'];
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (result.indexOf(field.type) === -1) {
          result.push(field.type);
        }
      }
    }
    return result;
  }, [fields]);

  const showFieldStats = useMemo(() => viewMode === VIEW_MODE.DOCUMENT_LEVEL, [viewMode]);

  const calculateMultiFields = () => {
    if (!useNewFieldsApi || !fields) {
      return undefined;
    }
    const map = new Map<string, Array<{ field: IndexPatternField; isSelected: boolean }>>();
    fields.forEach((field) => {
      const subTypeMulti = indexPatternUtils.getFieldSubtypeMulti(field);
      const parent = subTypeMulti?.multi.parent;
      if (!parent) {
        return;
      }
      const multiField = {
        field,
        isSelected: selectedFields.includes(field),
      };
      const value = map.get(parent) ?? [];
      value.push(multiField);
      map.set(parent, value);
    });
    return map;
  };

  const [multiFields, setMultiFields] = useState(() => calculateMultiFields());

  useShallowCompareEffect(() => {
    setMultiFields(calculateMultiFields());
  }, [fields, selectedFields, useNewFieldsApi]);

  const deleteField = useMemo(
    () =>
      canEditIndexPatternField && selectedIndexPattern
        ? async (fieldName: string) => {
            const ref = indexPatternFieldEditor.openDeleteModal({
              ctx: {
                dataView: selectedIndexPattern,
              },
              fieldName,
              onDelete: async () => {
                onEditRuntimeField();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            if (closeFlyout) {
              closeFlyout();
            }
          }
        : undefined,
    [
      selectedIndexPattern,
      canEditIndexPatternField,
      setFieldEditorRef,
      closeFlyout,
      onEditRuntimeField,
      indexPatternFieldEditor,
    ]
  );

  const getPaginated = useCallback(
    (list) => {
      return list.slice(0, fieldsToRender);
    },
    [fieldsToRender]
  );

  const filterChanged = useMemo(() => isEqual(fieldFilter, getDefaultFieldFilter()), [fieldFilter]);

  if (!selectedIndexPattern) {
    return null;
  }

  if (useFlyout) {
    return (
      <section
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={true}>
            <DiscoverIndexPattern
              selectedIndexPattern={selectedIndexPattern}
              indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
              onChangeIndexPattern={onChangeIndexPattern}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DiscoverIndexPatternManagement
              services={services}
              selectedIndexPattern={selectedIndexPattern}
              editField={editField}
              useNewFieldsApi={useNewFieldsApi}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>
    );
  }

  return (
    <EuiPageSideBar
      className="dscSidebar"
      aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
        defaultMessage: 'Index and fields',
      })}
      id="discover-sidebar"
      data-test-subj="discover-sidebar"
    >
      <EuiFlexGroup
        className="dscSidebar__group"
        direction="column"
        alignItems="stretch"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true} className="dscSidebar__indexPatternSwitcher">
              <DiscoverIndexPattern
                selectedIndexPattern={selectedIndexPattern}
                indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
                onChangeIndexPattern={onChangeIndexPattern}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DiscoverIndexPatternManagement
                services={services}
                selectedIndexPattern={selectedIndexPattern}
                useNewFieldsApi={useNewFieldsApi}
                editField={editField}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <form>
            <DiscoverFieldSearch
              onChange={onChangeFieldSearch}
              value={fieldFilter.name}
              types={fieldTypes}
            />
          </form>
        </EuiFlexItem>
        <EuiFlexItem className="eui-yScroll">
          <div
            ref={(el) => {
              if (documents && el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={throttle(lazyScroll, 100)}
            className="eui-yScroll"
          >
            {Array.isArray(fields) && fields.length > 0 && (
              <div>
                {selectedFields &&
                selectedFields.length > 0 &&
                selectedFields[0].displayName !== '_source' ? (
                  <>
                    <EuiAccordion
                      id="dscSelectedFields"
                      initialIsOpen={true}
                      buttonContent={
                        <EuiText size="xs" id="selected_fields">
                          <strong>
                            <FormattedMessage
                              id="discover.fieldChooser.filter.selectedFieldsTitle"
                              defaultMessage="Selected fields"
                            />
                          </strong>
                        </EuiText>
                      }
                      extraAction={
                        <EuiNotificationBadge color={filterChanged ? 'subdued' : 'accent'} size="m">
                          {selectedFields.length}
                        </EuiNotificationBadge>
                      }
                    >
                      <EuiSpacer size="m" />
                      <ul
                        className="dscFieldList"
                        aria-labelledby="selected_fields"
                        data-test-subj={`fieldList-selected`}
                      >
                        {selectedFields.map((field: IndexPatternField) => {
                          return (
                            <li key={`field${field.name}`} data-attr-field={field.name}>
                              <DiscoverField
                                alwaysShowActionButton={alwaysShowActionButtons}
                                field={field}
                                indexPattern={selectedIndexPattern}
                                onAddField={onAddField}
                                onRemoveField={onRemoveField}
                                onAddFilter={onAddFilter}
                                getDetails={getDetailsByField}
                                selected={true}
                                trackUiMetric={trackUiMetric}
                                multiFields={multiFields?.get(field.name)}
                                onEditField={canEditIndexPatternField ? editField : undefined}
                                onDeleteField={canEditIndexPatternField ? deleteField : undefined}
                                showFieldStats={showFieldStats}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </EuiAccordion>
                    <EuiSpacer size="s" />{' '}
                  </>
                ) : null}
                <EuiAccordion
                  id="dscAvailableFields"
                  initialIsOpen={true}
                  buttonContent={
                    <EuiText size="xs" id="available_fields">
                      <strong>
                        <FormattedMessage
                          id="discover.fieldChooser.filter.availableFieldsTitle"
                          defaultMessage="Available fields"
                        />
                      </strong>
                    </EuiText>
                  }
                  extraAction={
                    <EuiNotificationBadge size="m" color={filterChanged ? 'subdued' : 'accent'}>
                      {popularFields.length + unpopularFields.length}
                    </EuiNotificationBadge>
                  }
                >
                  <EuiSpacer size="s" />
                  {popularFields.length > 0 && (
                    <>
                      <EuiTitle size="xxxs" className="dscFieldListHeader">
                        <h4 id="available_fields_popular">
                          <FormattedMessage
                            id="discover.fieldChooser.filter.popularTitle"
                            defaultMessage="Popular"
                          />
                        </h4>
                      </EuiTitle>
                      <ul
                        className="dscFieldList dscFieldList--popular"
                        aria-labelledby="available_fields available_fields_popular"
                        data-test-subj={`fieldList-popular`}
                      >
                        {popularFields.map((field: IndexPatternField) => {
                          return (
                            <li key={`field${field.name}`} data-attr-field={field.name}>
                              <DiscoverField
                                alwaysShowActionButton={alwaysShowActionButtons}
                                field={field}
                                indexPattern={selectedIndexPattern}
                                onAddField={onAddField}
                                onRemoveField={onRemoveField}
                                onAddFilter={onAddFilter}
                                getDetails={getDetailsByField}
                                trackUiMetric={trackUiMetric}
                                multiFields={multiFields?.get(field.name)}
                                onEditField={canEditIndexPatternField ? editField : undefined}
                                onDeleteField={canEditIndexPatternField ? deleteField : undefined}
                                showFieldStats={showFieldStats}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  <ul
                    className="dscFieldList dscFieldList--unpopular"
                    aria-labelledby="available_fields"
                    data-test-subj={`fieldList-unpopular`}
                    ref={availableFieldsContainer}
                  >
                    {getPaginated(unpopularFields).map((field: IndexPatternField) => {
                      return (
                        <li key={`field${field.name}`} data-attr-field={field.name}>
                          <DiscoverField
                            alwaysShowActionButton={alwaysShowActionButtons}
                            field={field}
                            indexPattern={selectedIndexPattern}
                            onAddField={onAddField}
                            onRemoveField={onRemoveField}
                            onAddFilter={onAddFilter}
                            getDetails={getDetailsByField}
                            trackUiMetric={trackUiMetric}
                            multiFields={multiFields?.get(field.name)}
                            onEditField={canEditIndexPatternField ? editField : undefined}
                            onDeleteField={canEditIndexPatternField ? deleteField : undefined}
                            showFieldStats={showFieldStats}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </EuiAccordion>
              </div>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageSideBar>
  );
}

export const DiscoverSidebar = memo(DiscoverSidebarComponent);
