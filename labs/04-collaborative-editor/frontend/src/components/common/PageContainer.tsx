import { ReactNode } from 'react';
import Box, { BoxProps } from '@mui/material/Box';

export interface PageContainerProps extends BoxProps {
  children: ReactNode;
}

export function PageContainer({ children, sx, ...rest }: PageContainerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        p: { xs: 2, sm: 3, md: 4 },
        boxSizing: 'border-box',
        overflow: 'hidden',
        backgroundColor: 'background.default',
        color: 'text.primary',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
