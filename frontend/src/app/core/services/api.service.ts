import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ChatResponse,
  FlowGraph,
  ParseSpecResponse,
  ProjectDetailsResponse,
  ProjectListItem,
  UploadSpecResponse
} from '../models/api-doc.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  uploadSpec(file: File, projectName: string, description = ''): Observable<UploadSpecResponse> {
    const formData = new FormData();
    formData.append('specFile', file);
    formData.append('projectName', projectName);
    formData.append('description', description);

    return this.http.post<UploadSpecResponse>(`${this.baseUrl}/upload-spec`, formData);
  }

  parseSpec(projectId: string): Observable<ParseSpecResponse> {
    return this.http.post<ParseSpecResponse>(`${this.baseUrl}/parse-spec`, { projectId });
  }

  getProjects(): Observable<{ projects: ProjectListItem[] }> {
    return this.http.get<{ projects: ProjectListItem[] }>(`${this.baseUrl}/projects`);
  }

  getProject(projectId: string): Observable<ProjectDetailsResponse> {
    return this.http.get<ProjectDetailsResponse>(`${this.baseUrl}/project/${projectId}`);
  }

  deleteProject(projectId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/project/${projectId}`);
  }

  getFlow(projectId: string): Observable<{ flow: FlowGraph }> {
    return this.http.get<{ flow: FlowGraph }>(`${this.baseUrl}/project/${projectId}/flow`);
  }

  askApi(projectId: string, question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/project/${projectId}/chat`, { question });
  }

  mockRequest(
    projectId: string,
    method: string,
    endpointPath: string
  ): Observable<HttpResponse<unknown>> {
    const normalized = endpointPath.replace(/^\//, '');
    return this.http.request(method.toUpperCase(), `${this.baseUrl}/project/${projectId}/mock/${normalized}`, {
      observe: 'response'
    });
  }

  getSharedDocumentation(slug: string): Observable<ProjectDetailsResponse> {
    return this.http.get<ProjectDetailsResponse>(`${this.baseUrl}/share/${slug}`);
  }
}
