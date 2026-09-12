import React from 'react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import { MOTOR_PANEL } from './dyspraxiaMotorContent';

const DyspraxiaMotorProgress: React.FC = () => {
  const completions = useChildProgressStore(state => state.completions);
  const { isReady } = useChildProgressReadAccess();
  if (!isReady) return null;
  const today = new Date().toISOString().slice(0, 10);
  const count = (activityId: string) => completions.filter(item => item.neuroId === 'dyspraxia'
    && item.activityId === activityId && item.completedAt.startsWith(today)).length;
  const placement = count('dyspraxia-fine-motor');
  const cards = count('dyspraxia-gross-motor');
  if (placement + cards === 0) return null;
  return <section aria-label="Today's placement and movement-card practice" className={MOTOR_PANEL}>
    <h2 className="text-lg font-bold">Placement and card exploration</h2>
    <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><dt>Placement practices</dt><dd className="text-2xl font-bold" data-testid="motor-placement-count">{placement}</dd></div>
      <div><dt>Movement-card explorations</dt><dd className="text-2xl font-bold" data-testid="motor-card-count">{cards}</dd></div>
    </dl>
    <p className="mt-3 text-sm">These are today's recorded activities, not movements performed, coordination scores or completed step plans. Read, rest and help choices count equally as card exploration.</p>
  </section>;
};

export default DyspraxiaMotorProgress;
