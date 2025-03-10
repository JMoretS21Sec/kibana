/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { DataStream } from '../types';

interface IPolicyConfigContext {
  setMonitorType: React.Dispatch<React.SetStateAction<DataStream>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setLocations: React.Dispatch<React.SetStateAction<string[]>>;
  setIsTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsZipUrlTLSEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  monitorType: DataStream;
  defaultMonitorType: DataStream;
  isTLSEnabled?: boolean;
  isZipUrlTLSEnabled?: boolean;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  isEditable?: boolean;
  defaultName?: string;
  name?: string;
  defaultLocations?: string[];
  locations?: string[];
}

interface IPolicyConfigContextProvider {
  children: React.ReactNode;
  defaultMonitorType?: DataStream;
  defaultIsTLSEnabled?: boolean;
  defaultIsZipUrlTLSEnabled?: boolean;
  defaultName?: string;
  defaultLocations?: string[];
  isEditable?: boolean;
}

export const initialValue = DataStream.HTTP;

const defaultContext: IPolicyConfigContext = {
  setMonitorType: (_monitorType: React.SetStateAction<DataStream>) => {
    throw new Error('setMonitorType was not initialized, set it when you invoke the context');
  },
  setName: (_name: React.SetStateAction<string>) => {
    throw new Error('setName was not initialized, set it when you invoke the context');
  },
  setLocations: (_locations: React.SetStateAction<string[]>) => {
    throw new Error('setLocations was not initialized, set it when you invoke the context');
  },
  setIsTLSEnabled: (_isTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error('setIsTLSEnabled was not initialized, set it when you invoke the context');
  },
  setIsZipUrlTLSEnabled: (_isZipUrlTLSEnabled: React.SetStateAction<boolean>) => {
    throw new Error(
      'setIsZipUrlTLSEnabled was not initialized, set it when you invoke the context'
    );
  },
  monitorType: initialValue, // mutable
  defaultMonitorType: initialValue, // immutable,
  defaultIsTLSEnabled: false,
  defaultIsZipUrlTLSEnabled: false,
  defaultName: '',
  defaultLocations: [],
  isEditable: false,
};

export const PolicyConfigContext = createContext(defaultContext);

export function PolicyConfigContextProvider<ExtraFields = unknown>({
  children,
  defaultMonitorType = initialValue,
  defaultIsTLSEnabled = false,
  defaultIsZipUrlTLSEnabled = false,
  defaultName = '',
  defaultLocations = [],
  isEditable = false,
}: IPolicyConfigContextProvider) {
  const [monitorType, setMonitorType] = useState<DataStream>(defaultMonitorType);
  const [name, setName] = useState<string>(defaultName);
  const [locations, setLocations] = useState<string[]>(defaultLocations);
  const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
  const [isZipUrlTLSEnabled, setIsZipUrlTLSEnabled] = useState<boolean>(defaultIsZipUrlTLSEnabled);

  const value = useMemo(() => {
    return {
      monitorType,
      setMonitorType,
      defaultMonitorType,
      isTLSEnabled,
      isZipUrlTLSEnabled,
      setIsTLSEnabled,
      setIsZipUrlTLSEnabled,
      defaultIsTLSEnabled,
      defaultIsZipUrlTLSEnabled,
      isEditable,
      defaultName,
      name,
      setName,
      defaultLocations,
      locations,
      setLocations,
    };
  }, [
    monitorType,
    defaultMonitorType,
    isTLSEnabled,
    isZipUrlTLSEnabled,
    defaultIsTLSEnabled,
    defaultIsZipUrlTLSEnabled,
    isEditable,
    name,
    defaultName,
    locations,
    defaultLocations,
  ]);

  return <PolicyConfigContext.Provider value={value} children={children} />;
}

export function usePolicyConfigContext() {
  return useContext(PolicyConfigContext);
}
