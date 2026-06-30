import type { WorkflowData } from "../WorkflowGraph";

export interface OriginalStep {
  id: number;
  title: string;
  actor?: string;
  department?: string;
  type: string;
  dependencies?: number[];
}

export interface OptimizedWorkflowStep {
  id: number;
  title: string;
  actor: string;
  department: string;
  type: string;
  execution_mode: string;
  inputs: string[];
  outputs: string[];
  dependencies: number[];
  change: string; // kept, automated, merged, removed, parallelized, new
  change_reason: string;
}

export interface RemovedStep { step_title: string; reason: string; impact: string; }
export interface MergedStep { original_steps: string[]; new_step: string; reason: string; }
export interface AutomationCandidate { step_title: string; suggestion: string; time_saved: string; }
export interface ImplementationPhase { phase_name: string; title: string; duration: string; description: string; }

export interface WorkflowOptimizationData {
  current_steps: number;
  optimized_steps: number;
  step_reduction: number;
  optimized_graph: OptimizedWorkflowStep[];
  removed_steps: RemovedStep[];
  merged_steps: MergedStep[];
  automation_candidates: AutomationCandidate[];
  estimated_time_saved: string;
  estimated_cost_saved: string;
  estimated_manual_work_reduction: number;
  estimated_human_errors_prevented: number;
  estimated_productivity_increase: number;
  automation_score: number;
  implementation_plan: ImplementationPhase[];
  executive_summary: string;
  confidence: number;
}

export interface OptimizerProps {
  optimization: WorkflowOptimizationData;
  originalWorkflow: WorkflowData;
}
