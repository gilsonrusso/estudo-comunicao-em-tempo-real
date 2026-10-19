import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { TemplateItem } from '../types/template.types';

export interface TemplateSelectorProps {
  templates: TemplateItem[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Escolha o Template LaTeX Base:
      </Typography>

      <Grid container spacing={1.5}>
        {templates.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          return (
            <Grid key={tpl.id} size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  position: 'relative',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderWidth: isSelected ? 2 : 1,
                  backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <CardActionArea onClick={() => onSelectTemplate(tpl.id)} sx={{ p: 1.5 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <DescriptionIcon
                        color={isSelected ? 'primary' : 'action'}
                        fontSize="medium"
                        sx={{ mt: 0.2 }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, lineHeight: 1.2 }}
                          noWrap
                        >
                          {tpl.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            height: 32,
                            mt: 0.5,
                          }}
                        >
                          {tpl.description}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 0.8, mt: 1, alignItems: 'center' }}>
                          <Chip
                            label={tpl.hasCls ? 'Inclui arquivo .cls' : 'Classe Padrão'}
                            size="small"
                            color={tpl.hasCls ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.675rem', height: 20 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {tpl.filesCount} {tpl.filesCount === 1 ? 'arquivo' : 'arquivos'}
                          </Typography>
                        </Box>
                      </Box>

                      {isSelected && (
                        <CheckCircleIcon color="primary" fontSize="small" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
