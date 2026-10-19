import { ReactNode } from 'react';
import Box, { BoxProps } from '@mui/material/Box';

export interface TableContainerProps extends BoxProps {
  children: ReactNode;
}

export function TableContainer({ children, sx, ...rest }: TableContainerProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
