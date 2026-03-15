import { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell.component';
import { LandingPageComponent } from './pages/landing/landing.page';
import { AuthCallbackPageComponent } from './pages/auth-callback/auth-callback.page';
import { DashboardPageComponent } from './pages/dashboard/dashboard.page';
import { DocsViewerPageComponent } from './pages/docs-viewer/docs-viewer.page';
import { EndpointExplorerPageComponent } from './pages/endpoint-explorer/endpoint-explorer.page';
import { HistoryPageComponent } from './pages/history/history.page';
import { ChatApiPageComponent } from './pages/chat-api/chat-api.page';
import { FlowVisualizationPageComponent } from './pages/flow-visualization/flow-visualization.page';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const appRoutes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    canActivate: [guestGuard],
    pathMatch: 'full'
  },
  {
    path: 'auth/callback',
    component: AuthCallbackPageComponent
  },
  {
    path: 'share/:slug',
    component: DocsViewerPageComponent
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'docs/:projectId', component: DocsViewerPageComponent },
      { path: 'explorer/:projectId', component: EndpointExplorerPageComponent },
      { path: 'history', component: HistoryPageComponent },
      { path: 'chat/:projectId', component: ChatApiPageComponent },
      { path: 'flow/:projectId', component: FlowVisualizationPageComponent }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
