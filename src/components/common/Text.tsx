import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography, Fonts } from '../../constants/theme';

type TypographyVariant = keyof typeof Typography;

interface CustomTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  italic?: boolean;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({
  children,
  variant = 'body',
  color,
  italic = false,
  align = 'left',
  style,
  ...props
}: CustomTextProps) {
  const { colors } = useTheme();

  const variantStyle = styles[variant];
  const textColor = color || colors.text;

  return (
    <RNText
      style={[
        variantStyle,
        {
          color: textColor,
          fontStyle: italic ? 'italic' : 'normal',
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: Fonts?.sans,
    ...Typography.h1,
  },
  h2: {
    fontFamily: Fonts?.sans,
    ...Typography.h2,
  },
  h3: {
    fontFamily: Fonts?.sans,
    ...Typography.h3,
  },
  subtitle: {
    fontFamily: Fonts?.sans,
    ...Typography.subtitle,
  },
  body: {
    fontFamily: Fonts?.sans,
    ...Typography.body,
  },
  bodySecondary: {
    fontFamily: Fonts?.sans,
    ...Typography.bodySecondary,
  },
  caption: {
    fontFamily: Fonts?.sans,
    ...Typography.caption,
  },
  button: {
    fontFamily: Fonts?.sans,
    ...Typography.button,
  },
});
export default Text;
