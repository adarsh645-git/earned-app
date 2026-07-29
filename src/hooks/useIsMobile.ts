import { useWindowDimensions } from 'react-native';

/** Shared narrow-viewport breakpoint — mirrors the `width >= 768` desktop
 * check already used ad hoc in DashboardScreen, centralized so other
 * screens/components don't duplicate the literal. */
export default function useIsMobile(breakpoint = 768): boolean {
  const { width } = useWindowDimensions();
  return width < breakpoint;
}
