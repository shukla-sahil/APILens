import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { FlowGraph } from '../../core/models/api-doc.models';
import { ProjectContextService } from '../../core/services/project-context.service';

interface PositionedNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-flow-visualization-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="flow-page">
      <header>
        <h2 class="page-title">API Flow Visualization</h2>
        <p class="page-lead">
          Visual graph of endpoint groups, request flow, resource relationships, and authentication dependencies.
        </p>
      </header>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="center-content" *ngIf="isLoading()">
        <div class="spinner-loader"></div>
        <p>Loading flow visualization...</p>
      </section>

      <section class="card legend" *ngIf="!isLoading() && graph()">
        <span><i class="dot group"></i> Endpoint Group</span>
        <span><i class="dot endpoint"></i> Endpoint</span>
        <span><i class="dot resource"></i> Resource</span>
        <span><i class="dot auth"></i> Authentication</span>
      </section>

      <section class="card graph-wrapper" *ngIf="!isLoading() && graph() as graphData">
        <svg [attr.viewBox]="'0 0 ' + viewBoxWidth() + ' ' + viewBoxHeight()" class="graph-canvas" role="img">
          <title>API flow graph</title>

          <g class="edges">
            <line
              *ngFor="let edge of graphData.edges"
              [attr.x1]="nodeCenterX(edge.source)"
              [attr.y1]="nodeCenterY(edge.source)"
              [attr.x2]="nodeCenterX(edge.target)"
              [attr.y2]="nodeCenterY(edge.target)"
            ></line>
          </g>

          <g class="nodes">
            <g *ngFor="let node of positionedNodes()" [attr.transform]="'translate(' + node.x + ',' + node.y + ')'">
              <rect width="210" height="54" rx="10" [attr.class]="'node node-' + node.type"></rect>
              <text x="12" y="22" class="node-type">{{ node.type }}</text>
              <text x="12" y="40" class="node-label">{{ node.label }}</text>
            </g>
          </g>
        </svg>
      </section>

      <section class="card empty" *ngIf="!isLoading() && graph() && graph()!.nodes.length === 0">
        No flow graph is available for this project yet.
      </section>
    </section>
  `,
  styles: [
    `
      .flow-page {
        display: grid;
        gap: 1rem;
      }

      .legend,
      .graph-wrapper,
      .empty {
        padding: 1rem;
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
      }

      .legend span {
        align-items: center;
        display: inline-flex;
        gap: 0.3rem;
      }

      .dot {
        border-radius: 999px;
        display: inline-block;
        height: 0.8rem;
        width: 0.8rem;
      }

      .dot.group {
        background: #2b9fff;
      }

      .dot.endpoint {
        background: #00c08b;
      }

      .dot.resource {
        background: #ff9f3a;
      }

      .dot.auth {
        background: #ff5f5f;
      }

      .graph-wrapper {
        overflow: auto;
      }

      .graph-canvas {
        min-width: 100%;
        width: 100%;
      }

      .edges line {
        stroke: color-mix(in srgb, var(--text-muted) 65%, transparent);
        stroke-width: 1.6;
      }

      .node {
        stroke: color-mix(in srgb, var(--text-primary) 35%, transparent);
        stroke-width: 1;
      }

      .node-group {
        fill: color-mix(in srgb, #2b9fff 20%, var(--panel-bg));
      }

      .node-endpoint {
        fill: color-mix(in srgb, #00c08b 20%, var(--panel-bg));
      }

      .node-resource {
        fill: color-mix(in srgb, #ff9f3a 20%, var(--panel-bg));
      }

      .node-auth {
        fill: color-mix(in srgb, #ff5f5f 18%, var(--panel-bg));
      }

      .node-type {
        fill: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
      }

      .node-label {
        fill: var(--text-primary);
        font-family: var(--font-sans);
        font-size: 12px;
      }

      .error {
        color: #ff857d;
        margin: 0;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowVisualizationPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly projectContext = inject(ProjectContextService);

  readonly graph = signal<FlowGraph | null>(null);
  readonly errorMessage = signal('');
  readonly isLoading = signal(true);

  readonly positionedNodes = computed<PositionedNode[]>(() => {
    const graph = this.graph();
    if (!graph) {
      return [];
    }

    const typeOrder = ['group', 'endpoint', 'resource', 'auth'];
    const grouped = typeOrder.map((type) => graph.nodes.filter((node) => node.type === type));

    const positioned: PositionedNode[] = [];
    grouped.forEach((nodes, typeIndex) => {
      nodes.forEach((node, index) => {
        positioned.push({
          id: node.id,
          type: node.type,
          label: node.label,
          x: 40 + typeIndex * 260,
          y: 50 + index * 84
        });
      });
    });

    return positioned;
  });

  readonly viewBoxWidth = computed(() => {
    const columns = 4;
    return columns * 260 + 80;
  });

  readonly viewBoxHeight = computed(() => {
    const maxRows = Math.max(
      1,
      ...['group', 'endpoint', 'resource', 'auth'].map(
        (type) => this.positionedNodes().filter((node) => node.type === type).length
      )
    );

    return maxRows * 84 + 90;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');
      if (!projectId) {
        this.errorMessage.set('projectId is required');
        this.isLoading.set(false);
        return;
      }

      this.projectContext.setActiveProject(projectId);
      this.loadFlow(projectId);
    });
  }

  nodeCenterX(nodeId: string): number {
    const node = this.positionedNodes().find((entry) => entry.id === nodeId);
    return node ? node.x + 105 : 0;
  }

  nodeCenterY(nodeId: string): number {
    const node = this.positionedNodes().find((entry) => entry.id === nodeId);
    return node ? node.y + 27 : 0;
  }

  private loadFlow(projectId: string): void {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.graph.set(null);

    this.api.getFlow(projectId).subscribe({
      next: (result) => {
        this.graph.set(result.flow);
        this.isLoading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage.set(error?.error?.message || 'Failed to load flow visualization.');
        this.isLoading.set(false);
      }
    });
  }
}
