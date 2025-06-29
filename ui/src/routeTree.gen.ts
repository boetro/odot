/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { Route as rootRouteImport } from './routes/__root'
import { Route as LoginRouteImport } from './routes/login'
import { Route as appRouteRouteImport } from './routes/(app)/route'
import { Route as appIndexRouteImport } from './routes/(app)/index'
import { Route as appCalendarRouteImport } from './routes/(app)/calendar'
import { Route as appProjectsProjectIdRouteImport } from './routes/(app)/projects/$projectId'

const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const appRouteRoute = appRouteRouteImport.update({
  id: '/(app)',
  getParentRoute: () => rootRouteImport,
} as any)
const appIndexRoute = appIndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => appRouteRoute,
} as any)
const appCalendarRoute = appCalendarRouteImport.update({
  id: '/calendar',
  path: '/calendar',
  getParentRoute: () => appRouteRoute,
} as any)
const appProjectsProjectIdRoute = appProjectsProjectIdRouteImport.update({
  id: '/projects/$projectId',
  path: '/projects/$projectId',
  getParentRoute: () => appRouteRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof appIndexRoute
  '/login': typeof LoginRoute
  '/calendar': typeof appCalendarRoute
  '/projects/$projectId': typeof appProjectsProjectIdRoute
}
export interface FileRoutesByTo {
  '/login': typeof LoginRoute
  '/calendar': typeof appCalendarRoute
  '/': typeof appIndexRoute
  '/projects/$projectId': typeof appProjectsProjectIdRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/(app)': typeof appRouteRouteWithChildren
  '/login': typeof LoginRoute
  '/(app)/calendar': typeof appCalendarRoute
  '/(app)/': typeof appIndexRoute
  '/(app)/projects/$projectId': typeof appProjectsProjectIdRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/login' | '/calendar' | '/projects/$projectId'
  fileRoutesByTo: FileRoutesByTo
  to: '/login' | '/calendar' | '/' | '/projects/$projectId'
  id:
    | '__root__'
    | '/(app)'
    | '/login'
    | '/(app)/calendar'
    | '/(app)/'
    | '/(app)/projects/$projectId'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  appRouteRoute: typeof appRouteRouteWithChildren
  LoginRoute: typeof LoginRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/(app)': {
      id: '/(app)'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof appRouteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/(app)/': {
      id: '/(app)/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof appIndexRouteImport
      parentRoute: typeof appRouteRoute
    }
    '/(app)/calendar': {
      id: '/(app)/calendar'
      path: '/calendar'
      fullPath: '/calendar'
      preLoaderRoute: typeof appCalendarRouteImport
      parentRoute: typeof appRouteRoute
    }
    '/(app)/projects/$projectId': {
      id: '/(app)/projects/$projectId'
      path: '/projects/$projectId'
      fullPath: '/projects/$projectId'
      preLoaderRoute: typeof appProjectsProjectIdRouteImport
      parentRoute: typeof appRouteRoute
    }
  }
}

interface appRouteRouteChildren {
  appCalendarRoute: typeof appCalendarRoute
  appIndexRoute: typeof appIndexRoute
  appProjectsProjectIdRoute: typeof appProjectsProjectIdRoute
}

const appRouteRouteChildren: appRouteRouteChildren = {
  appCalendarRoute: appCalendarRoute,
  appIndexRoute: appIndexRoute,
  appProjectsProjectIdRoute: appProjectsProjectIdRoute,
}

const appRouteRouteWithChildren = appRouteRoute._addFileChildren(
  appRouteRouteChildren,
)

const rootRouteChildren: RootRouteChildren = {
  appRouteRoute: appRouteRouteWithChildren,
  LoginRoute: LoginRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
