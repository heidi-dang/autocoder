import { motion } from 'framer-motion';
import { useWorkspaceStore, type WorkflowStep } from '@/lib/workspace/state';
import { CheckCircle2, Circle } from 'lucide-react';

const steps: { key: WorkflowStep; label: string; }[] = [
  { key: 'brainstorm', label: 'Brainstorm' },
  { key: 'plan', label: 'Plan' },
  { key: 'implement', label: 'Implement' },
  { key: 'verify', label: 'Verify' },
];

export function WorkflowStepper() {
  const { currentStep, setCurrentStep } = useWorkspaceStore();
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="workflow-stepper">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = index < currentIndex;
        const isClickable = index <= currentIndex + 1;

        return (
          <div key={step.key} className="stepper-item-wrapper">
            <button
              onClick={() => isClickable && setCurrentStep(step.key)}
              disabled={!isClickable}
              className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <div className="stepper-icon">
                {isCompleted ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Circle size={20} fill={isActive ? 'currentColor' : 'none'} />
                )}
              </div>
              <span className="stepper-label">{step.label}</span>
              {isActive && (
                <motion.div
                  className="stepper-indicator"
                  layoutId="active-step"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
            {index < steps.length - 1 && (
              <div className={`stepper-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
