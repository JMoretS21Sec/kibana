/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { SOURCE_NAMES, SOURCE_OBJ_TYPES, GITHUB_LINK_TITLE } from '../../constants';
import {
  ADD_BOX_PATH,
  ADD_CONFLUENCE_PATH,
  ADD_CONFLUENCE_SERVER_PATH,
  ADD_DROPBOX_PATH,
  ADD_GITHUB_ENTERPRISE_PATH,
  ADD_GITHUB_PATH,
  ADD_GMAIL_PATH,
  ADD_GOOGLE_DRIVE_PATH,
  ADD_JIRA_PATH,
  ADD_JIRA_SERVER_PATH,
  ADD_ONEDRIVE_PATH,
  ADD_SALESFORCE_PATH,
  ADD_SALESFORCE_SANDBOX_PATH,
  ADD_SERVICENOW_PATH,
  ADD_SHAREPOINT_PATH,
  ADD_SLACK_PATH,
  ADD_ZENDESK_PATH,
  ADD_CUSTOM_PATH,
  EDIT_BOX_PATH,
  EDIT_CONFLUENCE_PATH,
  EDIT_CONFLUENCE_SERVER_PATH,
  EDIT_DROPBOX_PATH,
  EDIT_GITHUB_ENTERPRISE_PATH,
  EDIT_GITHUB_PATH,
  EDIT_GMAIL_PATH,
  EDIT_GOOGLE_DRIVE_PATH,
  EDIT_JIRA_PATH,
  EDIT_JIRA_SERVER_PATH,
  EDIT_ONEDRIVE_PATH,
  EDIT_SALESFORCE_PATH,
  EDIT_SALESFORCE_SANDBOX_PATH,
  EDIT_SERVICENOW_PATH,
  EDIT_SHAREPOINT_PATH,
  EDIT_SLACK_PATH,
  EDIT_ZENDESK_PATH,
  EDIT_CUSTOM_PATH,
  BOX_DOCS_URL,
  CONFLUENCE_DOCS_URL,
  CONFLUENCE_SERVER_DOCS_URL,
  GITHUB_ENTERPRISE_DOCS_URL,
  DROPBOX_DOCS_URL,
  GITHUB_DOCS_URL,
  GMAIL_DOCS_URL,
  GOOGLE_DRIVE_DOCS_URL,
  JIRA_DOCS_URL,
  JIRA_SERVER_DOCS_URL,
  ONEDRIVE_DOCS_URL,
  SALESFORCE_DOCS_URL,
  SERVICENOW_DOCS_URL,
  SHAREPOINT_DOCS_URL,
  SLACK_DOCS_URL,
  ZENDESK_DOCS_URL,
  CUSTOM_SOURCE_DOCS_URL,
} from '../../routes';
import { FeatureIds, SourceDataItem } from '../../types';

export const staticSourceData = [
  {
    name: SOURCE_NAMES.BOX,
    serviceType: 'box',
    addPath: ADD_BOX_PATH,
    editPath: EDIT_BOX_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: BOX_DOCS_URL,
      applicationPortalUrl: 'https://app.box.com/developers/console',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.CONFLUENCE,
    serviceType: 'confluence_cloud',
    addPath: ADD_CONFLUENCE_PATH,
    editPath: EDIT_CONFLUENCE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: CONFLUENCE_DOCS_URL,
      applicationPortalUrl: 'https://developer.atlassian.com/console/myapps/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.PAGES,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.BLOG_POSTS,
      SOURCE_OBJ_TYPES.SPACES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.CONFLUENCE_SERVER,
    serviceType: 'confluence_server',
    addPath: ADD_CONFLUENCE_SERVER_PATH,
    editPath: EDIT_CONFLUENCE_SERVER_PATH,
    configuration: {
      isPublicKey: true,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: CONFLUENCE_SERVER_DOCS_URL,
    },
    objTypes: [
      SOURCE_OBJ_TYPES.PAGES,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.BLOG_POSTS,
      SOURCE_OBJ_TYPES.SPACES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.DROPBOX,
    serviceType: 'dropbox',
    addPath: ADD_DROPBOX_PATH,
    editPath: EDIT_DROPBOX_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: DROPBOX_DOCS_URL,
      applicationPortalUrl: 'https://www.dropbox.com/developers/apps',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.GITHUB,
    serviceType: 'github',
    addPath: ADD_GITHUB_PATH,
    editPath: EDIT_GITHUB_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsConfiguration: true,
      documentationUrl: GITHUB_DOCS_URL,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
      SOURCE_OBJ_TYPES.FILES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.GITHUB_ENTERPRISE,
    serviceType: 'github_enterprise_server',
    addPath: ADD_GITHUB_ENTERPRISE_PATH,
    editPath: EDIT_GITHUB_ENTERPRISE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsConfiguration: true,
      needsBaseUrl: true,
      baseUrlTitle: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.baseUrlTitles.github',
        {
          defaultMessage: 'GitHub Enterprise URL',
        }
      ),
      documentationUrl: GITHUB_ENTERPRISE_DOCS_URL,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
      SOURCE_OBJ_TYPES.FILES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.GMAIL,
    serviceType: 'gmail',
    addPath: ADD_GMAIL_PATH,
    editPath: EDIT_GMAIL_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: GMAIL_DOCS_URL,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.EMAILS],
    features: {
      platinumPrivateContext: [FeatureIds.Remote, FeatureIds.Private, FeatureIds.SearchableContent],
    },
    accountContextOnly: true,
  },
  {
    name: SOURCE_NAMES.GOOGLE_DRIVE,
    serviceType: 'google_drive',
    addPath: ADD_GOOGLE_DRIVE_PATH,
    editPath: EDIT_GOOGLE_DRIVE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: GOOGLE_DRIVE_DOCS_URL,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.FOLDERS,
      SOURCE_OBJ_TYPES.G_SUITE_FILES,
      SOURCE_OBJ_TYPES.ALL_STORED_FILES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.JIRA,
    serviceType: 'jira_cloud',
    addPath: ADD_JIRA_PATH,
    editPath: EDIT_JIRA_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: JIRA_DOCS_URL,
      applicationPortalUrl: 'https://developer.atlassian.com/console/myapps/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.EPICS,
      SOURCE_OBJ_TYPES.PROJECTS,
      SOURCE_OBJ_TYPES.TASKS,
      SOURCE_OBJ_TYPES.STORIES,
      SOURCE_OBJ_TYPES.BUGS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.JIRA_SERVER,
    serviceType: 'jira_server',
    addPath: ADD_JIRA_SERVER_PATH,
    editPath: EDIT_JIRA_SERVER_PATH,
    configuration: {
      isPublicKey: true,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: JIRA_SERVER_DOCS_URL,
      applicationPortalUrl: '',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.EPICS,
      SOURCE_OBJ_TYPES.PROJECTS,
      SOURCE_OBJ_TYPES.TASKS,
      SOURCE_OBJ_TYPES.STORIES,
      SOURCE_OBJ_TYPES.BUGS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.ONEDRIVE,
    serviceType: 'one_drive',
    addPath: ADD_ONEDRIVE_PATH,
    editPath: EDIT_ONEDRIVE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: ONEDRIVE_DOCS_URL,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SALESFORCE,
    serviceType: 'salesforce',
    addPath: ADD_SALESFORCE_PATH,
    editPath: EDIT_SALESFORCE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SALESFORCE_DOCS_URL,
      applicationPortalUrl: 'https://salesforce.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
      SOURCE_OBJ_TYPES.CASES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SALESFORCE_SANDBOX,
    serviceType: 'salesforce_sandbox',
    addPath: ADD_SALESFORCE_SANDBOX_PATH,
    editPath: EDIT_SALESFORCE_SANDBOX_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SALESFORCE_DOCS_URL,
      applicationPortalUrl: 'https://test.salesforce.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
      SOURCE_OBJ_TYPES.CASES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SERVICENOW,
    serviceType: 'service_now',
    addPath: ADD_SERVICENOW_PATH,
    editPath: EDIT_SERVICENOW_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: false,
      needsBaseUrl: true,
      documentationUrl: SERVICENOW_DOCS_URL,
      applicationPortalUrl: 'https://www.servicenow.com/my-account/sign-in.html',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.USERS,
      SOURCE_OBJ_TYPES.INCIDENTS,
      SOURCE_OBJ_TYPES.ITEMS,
      SOURCE_OBJ_TYPES.ARTICLES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SHAREPOINT,
    serviceType: 'share_point',
    addPath: ADD_SHAREPOINT_PATH,
    editPath: EDIT_SHAREPOINT_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SHAREPOINT_DOCS_URL,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.SITES, SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SLACK,
    serviceType: 'slack',
    addPath: ADD_SLACK_PATH,
    editPath: EDIT_SLACK_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SLACK_DOCS_URL,
      applicationPortalUrl: 'https://api.slack.com/apps/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.PUBLIC_MESSAGES,
      SOURCE_OBJ_TYPES.PRIVATE_MESSAGES,
      SOURCE_OBJ_TYPES.DIRECT_MESSAGES,
    ],
    features: {
      platinumPrivateContext: [FeatureIds.Remote, FeatureIds.Private, FeatureIds.SearchableContent],
    },
    accountContextOnly: true,
  },
  {
    name: SOURCE_NAMES.ZENDESK,
    serviceType: 'zendesk',
    addPath: ADD_ZENDESK_PATH,
    editPath: EDIT_ZENDESK_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsSubdomain: true,
      documentationUrl: ZENDESK_DOCS_URL,
      applicationPortalUrl: 'https://www.zendesk.com/login/',
    },
    objTypes: [SOURCE_OBJ_TYPES.TICKETS],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.CUSTOM,
    serviceType: 'custom',
    addPath: ADD_CUSTOM_PATH,
    editPath: EDIT_CUSTOM_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: false,
      needsBaseUrl: false,
      helpText: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.helpText.custom', {
        defaultMessage:
          'To create a Custom API Source, provide a human-readable and descriptive name. The name will appear as-is in the various search experiences and management interfaces.',
      }),
      documentationUrl: CUSTOM_SOURCE_DOCS_URL,
      applicationPortalUrl: '',
    },
    accountContextOnly: false,
  },
] as SourceDataItem[];
