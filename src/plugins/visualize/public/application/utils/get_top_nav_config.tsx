/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { parse } from 'query-string';

import { Capabilities } from 'src/core/public';
import { TopNavMenuData } from 'src/plugins/navigation/public';
import {
  VISUALIZE_EMBEDDABLE_TYPE,
  VisualizeInput,
  getFullPath,
} from '../../../../visualizations/public';
import {
  showSaveModal,
  SavedObjectSaveModalOrigin,
  SavedObjectSaveOpts,
  OnSaveProps,
} from '../../../../saved_objects/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '../../../../presentation_util/public';
import { unhashUrl } from '../../../../kibana_utils/public';

import {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { APP_NAME, VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from './breadcrumbs';
import { EmbeddableStateTransfer } from '../../../../embeddable/public';
import { VISUALIZE_APP_LOCATOR, VisualizeLocatorParams } from '../../../common/locator';

interface VisualizeCapabilities {
  createShortUrl: boolean;
  delete: boolean;
  save: boolean;
  saveQuery: boolean;
  show: boolean;
}

export interface TopNavConfigParams {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  openInspector: () => void;
  originatingApp?: string;
  originatingPath?: string;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  hasUnappliedChanges: boolean;
  visInstance: VisualizeEditorVisInstance;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
  stateTransfer: EmbeddableStateTransfer;
  embeddableId?: string;
}

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.visualize) return false;

  const visualize = anonymousUserCapabilities.visualize as unknown as VisualizeCapabilities;

  return !!visualize.show;
};

export const getTopNavConfig = (
  {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    openInspector,
    originatingApp,
    originatingPath,
    setOriginatingApp,
    hasUnappliedChanges,
    visInstance,
    stateContainer,
    visualizationIdFromUrl,
    stateTransfer,
    embeddableId,
  }: TopNavConfigParams,
  {
    data,
    application,
    chrome,
    overlays,
    history,
    share,
    setActiveUrl,
    toastNotifications,
    visualizeCapabilities,
    dashboardCapabilities,
    i18n: { Context: I18nContext },
    dashboard,
    savedObjectsTagging,
    presentationUtil,
    usageCollection,
    getKibanaVersion,
    savedObjects,
    visualizations,
  }: VisualizeServices
) => {
  const { vis, embeddableHandler } = visInstance;
  const savedVis = visInstance.savedVis;

  const doTelemetryForSaveEvent = (visType: string) => {
    if (usageCollection) {
      usageCollection.reportUiCounter(
        originatingApp ?? APP_NAME,
        METRIC_TYPE.CLICK,
        `${visType}:save`
      );
    }
  };

  /**
   * Called when the user clicks "Save" button.
   */
  async function doSave(
    saveOptions: SavedObjectSaveOpts & { dashboardId?: string; copyOnSave?: boolean }
  ) {
    const newlyCreated = !Boolean(savedVis.id) || saveOptions.copyOnSave;
    // vis.title was not bound and it's needed to reflect title into visState
    stateContainer.transitions.setVis({
      title: savedVis.title,
    });
    savedVis.searchSourceFields = vis.data.searchSource?.getSerializedFields();
    savedVis.visState = stateContainer.getState().vis;
    savedVis.uiStateJSON = vis.uiState.toString();
    setHasUnsavedChanges(false);

    try {
      const id = await visualizations.saveVisualization(savedVis, saveOptions);

      if (id) {
        toastNotifications.addSuccess({
          title: i18n.translate('visualize.topNavMenu.saveVisualization.successNotificationText', {
            defaultMessage: `Saved '{visTitle}'`,
            values: {
              visTitle: savedVis.title,
            },
          }),
          'data-test-subj': 'saveVisualizationSuccess',
        });

        chrome.recentlyAccessed.add(getFullPath(id), savedVis.title, String(id));

        if ((originatingApp && saveOptions.returnToOrigin) || saveOptions.dashboardId) {
          if (!embeddableId) {
            const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(id)}`;

            // Manually insert a new url so the back button will open the saved visualization.
            history.replace(appPath);
            setActiveUrl(appPath);
          }

          const app = originatingApp || 'dashboards';

          let path;
          if (saveOptions.dashboardId) {
            path =
              saveOptions.dashboardId === 'new' ? '#/create' : `#/view/${saveOptions.dashboardId}`;
          } else if (originatingPath) {
            path = originatingPath;
          }

          if (stateTransfer) {
            stateTransfer.navigateToWithEmbeddablePackage(app, {
              state: {
                type: VISUALIZE_EMBEDDABLE_TYPE,
                input: { savedObjectId: id },
                embeddableId: saveOptions.copyOnSave ? undefined : embeddableId,
                searchSessionId: data.search.session.getSessionId(),
              },
              path,
            });
          } else {
            application.navigateToApp(app, { path });
          }
        } else {
          if (setOriginatingApp && originatingApp && newlyCreated) {
            setOriginatingApp(undefined);
            // remove editor state so the connection is still broken after reload
            stateTransfer.clearEditorState(VisualizeConstants.APP_ID);
          }
          chrome.docTitle.change(savedVis.lastSavedTitle);
          chrome.setBreadcrumbs(getEditBreadcrumbs({}, savedVis.lastSavedTitle));

          if (id !== visualizationIdFromUrl) {
            history.replace({
              ...history.location,
              pathname: `${VisualizeConstants.EDIT_PATH}/${id}`,
            });
          }
        }
      }

      return { id };
    } catch (error) {
      // eslint-disable-next-line
      console.error(error);
      toastNotifications.addDanger({
        title: i18n.translate('visualize.topNavMenu.saveVisualization.failureNotificationText', {
          defaultMessage: `Error on saving '{visTitle}'`,
          values: {
            visTitle: savedVis.title,
          },
        }),
        text: error.message,
        'data-test-subj': 'saveVisualizationError',
      });
      return { error };
    }
  }

  const createVisReference = () => {
    if (!originatingApp) {
      return;
    }

    const state = {
      input: {
        savedVis: vis.serialize(),
      } as VisualizeInput,
      embeddableId,
      type: VISUALIZE_EMBEDDABLE_TYPE,
      searchSessionId: data.search.session.getSessionId(),
    };

    stateTransfer.navigateToWithEmbeddablePackage(originatingApp, { state, path: originatingPath });
  };

  const navigateToOriginatingApp = () => {
    if (originatingApp) {
      application.navigateToApp(originatingApp);
    }
  };

  const allowByValue = dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables;
  const saveButtonLabel =
    !savedVis.id && allowByValue && originatingApp
      ? i18n.translate('visualize.topNavMenu.saveVisualizationToLibraryButtonLabel', {
          defaultMessage: 'Save to library',
        })
      : originatingApp && savedVis.id
      ? i18n.translate('visualize.topNavMenu.saveVisualizationAsButtonLabel', {
          defaultMessage: 'Save as',
        })
      : i18n.translate('visualize.topNavMenu.saveVisualizationButtonLabel', {
          defaultMessage: 'Save',
        });
  const showSaveAndReturn = originatingApp && (savedVis?.id || allowByValue);

  const showSaveButton =
    visualizeCapabilities.save ||
    (allowByValue && !showSaveAndReturn && dashboardCapabilities.showWriteControls);

  const topNavMenu: TopNavMenuData[] = [
    {
      id: 'inspector',
      label: i18n.translate('visualize.topNavMenu.openInspectorButtonLabel', {
        defaultMessage: 'inspect',
      }),
      description: i18n.translate('visualize.topNavMenu.openInspectorButtonAriaLabel', {
        defaultMessage: 'Open Inspector for visualization',
      }),
      testId: 'openInspectorButton',
      disableButton() {
        return !embeddableHandler.hasInspector || !embeddableHandler.hasInspector();
      },
      run: openInspector,
      tooltip() {
        if (!embeddableHandler.hasInspector || !embeddableHandler.hasInspector()) {
          return i18n.translate('visualize.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
    {
      id: 'share',
      label: i18n.translate('visualize.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('visualize.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: (anchorElement) => {
        if (share) {
          const currentState = stateContainer.getState();
          const searchParams = parse(history.location.search);
          const params: VisualizeLocatorParams = {
            visId: savedVis?.id,
            filters: currentState.filters,
            refreshInterval: undefined,
            timeRange: data.query.timefilter.timefilter.getTime(),
            uiState: currentState.uiState,
            query: currentState.query,
            vis: currentState.vis,
            linked: currentState.linked,
            indexPattern:
              visInstance.savedSearch?.searchSource?.getField('index')?.id ??
              (searchParams.indexPattern as string),
            savedSearchId: visInstance.savedSearch?.id ?? (searchParams.savedSearchId as string),
          };
          // TODO: support sharing in by-value mode
          share.toggleShareContextMenu({
            anchorElement,
            allowEmbed: true,
            allowShortUrl: Boolean(visualizeCapabilities.createShortUrl),
            shareableUrl: unhashUrl(window.location.href),
            objectId: savedVis?.id,
            objectType: 'visualization',
            sharingData: {
              title:
                savedVis?.title ||
                i18n.translate('visualize.reporting.defaultReportTitle', {
                  defaultMessage: 'Visualization [{date}]',
                  values: { date: moment().toISOString(true) },
                }),
              locatorParams: {
                id: VISUALIZE_APP_LOCATOR,
                version: getKibanaVersion(),
                params,
              },
            },
            isDirty: hasUnappliedChanges || hasUnsavedChanges,
            showPublicUrlSwitch,
          });
        }
      },
      // disable the Share button if no action specified and fot byValue visualizations
      disableButton: !share || Boolean(!savedVis.id && allowByValue && originatingApp),
    },
    ...(originatingApp
      ? [
          {
            id: 'cancel',
            label: i18n.translate('visualize.topNavMenu.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            }),
            emphasize: false,
            description: i18n.translate('visualize.topNavMenu.cancelButtonAriaLabel', {
              defaultMessage: 'Return to the last app without saving changes',
            }),
            testId: 'visualizeCancelAndReturnButton',
            tooltip() {
              if (hasUnappliedChanges || hasUnsavedChanges) {
                return i18n.translate('visualize.topNavMenu.cancelAndReturnButtonTooltip', {
                  defaultMessage: 'Discard your changes before finishing',
                });
              }
            },
            run: async () => {
              return navigateToOriginatingApp();
            },
          },
        ]
      : []),
    ...(showSaveButton
      ? [
          {
            id: 'save',
            iconType: showSaveAndReturn ? undefined : 'save',
            label: saveButtonLabel,
            emphasize: !showSaveAndReturn,
            description: i18n.translate('visualize.topNavMenu.saveVisualizationButtonAriaLabel', {
              defaultMessage: 'Save Visualization',
            }),
            testId: 'visualizeSaveButton',
            disableButton: hasUnappliedChanges,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualize.topNavMenu.saveVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before saving',
                  }
                );
              }
            },
            run: () => {
              const onSave = async ({
                newTitle,
                newCopyOnSave,
                isTitleDuplicateConfirmed,
                onTitleDuplicate,
                newDescription,
                returnToOrigin,
                dashboardId,
                addToLibrary,
              }: OnSaveProps & { returnToOrigin?: boolean } & {
                dashboardId?: string | null;
                addToLibrary?: boolean;
              }) => {
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                embeddableHandler.updateInput({ title: newTitle });
                savedVis.description = newDescription;

                if (savedObjectsTagging) {
                  savedVis.tags = selectedTags;
                }

                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin,
                  dashboardId: !!dashboardId ? dashboardId : undefined,
                  copyOnSave: newCopyOnSave,
                };

                // If we're adding to a dashboard and not saving to library,
                // we'll want to use a by-value operation
                if (dashboardId && !addToLibrary) {
                  const appPath = `${VisualizeConstants.LANDING_PAGE_PATH}`;

                  // Manually insert a new url so the back button will open the saved visualization.
                  history.replace(appPath);
                  setActiveUrl(appPath);

                  const state = {
                    input: {
                      savedVis: {
                        ...vis.serialize(),
                        title: newTitle,
                        description: newDescription,
                      },
                    } as VisualizeInput,
                    embeddableId,
                    type: VISUALIZE_EMBEDDABLE_TYPE,
                    searchSessionId: data.search.session.getSessionId(),
                  };

                  const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

                  stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
                    state,
                    path,
                  });

                  // TODO: Saved Object Modal requires `id` to be defined so this is a workaround
                  return { id: true };
                }

                doTelemetryForSaveEvent(vis.type.name);

                // We're adding the viz to a library so we need to save it and then
                // add to a dashboard if necessary
                const response = await doSave(saveOptions);
                // If the save wasn't successful, put the original values back.
                if (!response.id || response.error) {
                  savedVis.title = currentTitle;
                }

                return response;
              };

              let selectedTags: string[] = [];
              let tagOptions: React.ReactNode | undefined;

              if (savedObjectsTagging) {
                selectedTags = savedVis.tags || [];
                tagOptions = (
                  <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
                    initialSelection={selectedTags}
                    onTagsSelected={(newSelection) => {
                      selectedTags = newSelection;
                    }}
                  />
                );
              }

              const useByRefFlow =
                !!originatingApp || !dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables;

              let saveModal;

              if (useByRefFlow) {
                saveModal = (
                  <SavedObjectSaveModalOrigin
                    documentInfo={savedVis || { title: '' }}
                    onSave={onSave}
                    options={tagOptions}
                    getAppNameFromId={stateTransfer.getAppNameFromId}
                    objectType={i18n.translate('visualize.topNavMenu.saveVisualizationObjectType', {
                      defaultMessage: 'visualization',
                    })}
                    onClose={() => {}}
                    originatingApp={originatingApp}
                    returnToOriginSwitchLabel={
                      originatingApp && embeddableId
                        ? i18n.translate('visualize.topNavMenu.updatePanel', {
                            defaultMessage: 'Update panel on {originatingAppName}',
                            values: {
                              originatingAppName: stateTransfer.getAppNameFromId(originatingApp),
                            },
                          })
                        : undefined
                    }
                  />
                );
              } else {
                saveModal = (
                  <SavedObjectSaveModalDashboard
                    documentInfo={{
                      id: visualizeCapabilities.save ? savedVis?.id : undefined,
                      title: savedVis?.title || '',
                      description: savedVis?.description || '',
                    }}
                    canSaveByReference={Boolean(visualizeCapabilities.save)}
                    onSave={onSave}
                    tagOptions={tagOptions}
                    objectType={i18n.translate('visualize.topNavMenu.saveVisualizationObjectType', {
                      defaultMessage: 'visualization',
                    })}
                    onClose={() => {}}
                  />
                );
              }

              showSaveModal(
                saveModal,
                I18nContext,
                !useByRefFlow ? presentationUtil.ContextProvider : React.Fragment
              );
            },
          },
        ]
      : []),
    ...(showSaveAndReturn
      ? [
          {
            id: 'saveAndReturn',
            label: i18n.translate('visualize.topNavMenu.saveAndReturnVisualizationButtonLabel', {
              defaultMessage: 'Save and return',
            }),
            emphasize: true,
            iconType: 'checkInCircleFilled',
            description: i18n.translate(
              'visualize.topNavMenu.saveAndReturnVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Finish editing visualization and return to the last app',
              }
            ),
            testId: 'visualizesaveAndReturnButton',
            disableButton: hasUnappliedChanges || !dashboardCapabilities.showWriteControls,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualize.topNavMenu.saveAndReturnVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before finishing',
                  }
                );
              }
            },
            run: async () => {
              doTelemetryForSaveEvent(vis.type.name);

              if (!savedVis?.id) {
                return createVisReference();
              }
              const saveOptions = {
                confirmOverwrite: false,
                returnToOrigin: true,
              };
              return doSave(saveOptions);
            },
          },
        ]
      : []),
  ];

  return topNavMenu;
};
