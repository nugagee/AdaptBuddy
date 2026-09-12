import { getAllActivitiesForNeuro, getDailyActivitiesForNeuro, isTrackableDailyActivity } from './neuroDashboardContent';
import { DYSPRAXIA_MOTOR_IDS, isDyspraxiaMotorActivity, MOVEMENT_CARDS, MOVEMENT_CHECKS, PLACEMENT_BOARDS, PLACEMENT_SPACES } from '../components/dashboard/dyspraxiaMotorContent';

test('the exact two motor identifiers have dedicated routing and no unrelated identifiers qualify', () => {
  expect(DYSPRAXIA_MOTOR_IDS).toEqual(['dyspraxia-fine-motor', 'dyspraxia-gross-motor']);
  DYSPRAXIA_MOTOR_IDS.forEach(id => expect(isDyspraxiaMotorActivity(id)).toBe(true));
  ['dyspraxia-sequence-steps', 'dysgraphia-trace-path', '', 'dyspraxia-fine-motor?stars=99'].forEach(id => expect(isDyspraxiaMotorActivity(id)).toBe(false));
});

test('all three Dyspraxia catalogue activities are usable with unchanged trusted rewards', () => {
  const tools = getAllActivitiesForNeuro('dyspraxia');
  expect(tools.map(tool => [tool.id, tool.starsReward, tool.durationMinutes])).toEqual([
    ['dyspraxia-fine-motor', 4, 10], ['dyspraxia-sequence-steps', 3, 8], ['dyspraxia-gross-motor', 3, 7],
  ]);
  expect(tools.every(isTrackableDailyActivity)).toBe(true);
  expect(tools.filter(tool => tool.availability === 'planned')).toEqual([]);
});

test('three daily seeds expose every real tool without duplicates', () => {
  const ids = [0, 1, 2].flatMap(seed => {
    const day = getDailyActivitiesForNeuro('dyspraxia', seed);
    expect(day).toHaveLength(2); expect(new Set(day.map(tool => tool.id)).size).toBe(2);
    return day.map(tool => tool.id);
  });
  expect(Array.from(new Set(ids))).toEqual(['dyspraxia-fine-motor', 'dyspraxia-sequence-steps', 'dyspraxia-gross-motor']);
});

test('placement boards provide unique readable names rather than colour-only targets', () => {
  expect(PLACEMENT_BOARDS).toHaveLength(3); expect(PLACEMENT_SPACES).toHaveLength(3);
  PLACEMENT_BOARDS.forEach(board => {
    expect(new Set(board.pieces).size).toBe(3); expect(board.symbols).toHaveLength(3);
    board.pieces.forEach(piece => expect(piece).toMatch(/[A-Za-z]/));
  });
});

test('movement cards are short optional familiar actions with an explicit rest step', () => {
  expect(MOVEMENT_CARDS).toHaveLength(3); expect(new Set(MOVEMENT_CARDS.map(card => card.id)).size).toBe(3);
  expect(MOVEMENT_CARDS.map(card => card.steps[2])).toEqual([
    'Let your arm rest again whenever you choose.',
    'Rest your feet again whenever you choose.',
    'Let your hands rest again whenever you choose.',
  ]);
  MOVEMENT_CARDS.forEach(card => {
    expect(card.steps).toHaveLength(3); expect(card.steps[1]).toMatch(/could/);
    expect(card.steps.join(' ')).not.toMatch(/jump|balance on|hold for|repeat \d|stand up|stretch as far/i);
  });
});

test('movement acknowledgements separately cover adult suitability, supported seating and comfort', () => {
  expect(MOVEMENT_CHECKS).toHaveLength(3); expect(new Set(MOVEMENT_CHECKS).size).toBe(3);
  expect(MOVEMENT_CHECKS[0]).toMatch(/trusted adult/); expect(MOVEMENT_CHECKS[1]).toMatch(/supported seat/);
  expect(MOVEMENT_CHECKS[2]).toMatch(/not push through pain/);
});

test('catalogue descriptions identify real participation alternatives, not therapy outcomes', () => {
  const tools = getAllActivitiesForNeuro('dyspraxia').filter(tool => isDyspraxiaMotorActivity(tool.id));
  expect(tools[0].description).toMatch(/without dragging/);
  expect(tools[1].description).toMatch(/read-only.*optional gentle seated/);
  tools.forEach(tool => expect(`${tool.description} ${tool.inspiration}`).not.toMatch(/cure|improve coordination|clinically validated|therapy programme/i));
});
