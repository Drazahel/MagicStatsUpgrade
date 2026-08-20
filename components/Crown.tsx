import Svg, { Path } from 'react-native-svg';

import { useAppTheme } from '@/components/AppTheme';

type CrownProps = {
  size?: number;
};

export function Crown({ size = 16 }: CrownProps) {
  const { colors } = useAppTheme();

  return (
    <Svg
      accessibilityLabel="Gagnant"
      height={size}
      viewBox="0 0 24 24"
      width={size}>
      <Path
        d="M5 16 3 6l5.2 4.2L12 4l3.8 6.2L21 6l-2 10H5Zm0 2h14v2H5v-2Z"
        fill={colors.gold}
      />
    </Svg>
  );
}
