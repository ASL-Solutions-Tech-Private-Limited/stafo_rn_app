jest.mock('lucide-react-native', () => new Proxy({}, {get: () => () => null}));
import {MODULES} from '../src/features/modules/catalog';
import {openModule} from '../src/features/modules/openModule';

// Every tile a role can see must open a real screen, never the "coming soon" page.
describe('module tiles', () => {
  for (const role of ['company', 'employee'] as const) {
    it(`all ${role} tiles open a screen`, () => {
      const placeholders: string[] = [];
      for (const m of MODULES.filter(x => x.roles.includes(role))) {
        const navigate = jest.fn();
        openModule({navigate} as never, m.id, role);
        if (navigate.mock.calls[0]?.[0] === 'Module') {
          placeholders.push(m.id);
        }
      }
      expect(placeholders).toEqual([]);
    });
  }
});
