import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { X, Code2, Languages, FileCode, Palette } from 'lucide-react';
import { EditorSettings } from '../../../types/settings.js';
import { getTranslations } from '../../../utils/i18n.js';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
}

type SettingsTab = 'editor' | 'language' | 'compiler' | 'appearance';

export function SettingsModal({ open, onClose, settings, onUpdateSettings }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const t = getTranslations(settings.uiLanguage).settings;

  const tabs: { id: SettingsTab; label: string; icon: typeof Code2 }[] = [
    { id: 'editor', label: t.tabs.editor, icon: Code2 },
    { id: 'language', label: t.tabs.language, icon: Languages },
    { id: 'compiler', label: t.tabs.compiler, icon: FileCode },
    { id: 'appearance', label: t.tabs.appearance, icon: Palette },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            height: 540,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* Cabeçalho do Modal estilo Overleaf */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography component="span" sx={{ fontSize: '1.15rem', fontWeight: 600 }}>
          {t.title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t.close}
          sx={{ color: 'text.secondary' }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      {/* Conteúdo com Sidebar lateral e Painel Direito */}
      <DialogContent sx={{ p: 0, display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Menu Lateral Esquerdo */}
        <Box
          component="nav"
          sx={{
            width: 220,
            borderRight: 1,
            borderColor: 'divider',
            backgroundColor: 'background.default',
            py: 1.5,
            px: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <Box
                key={tab.id}
                component="button"
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'primary.main' : 'text.primary',
                  backgroundColor: isActive ? 'rgba(5, 150, 105, 0.12)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(5, 150, 105, 0.16)' : 'action.hover',
                  },
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Icon size={16} />
                <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>
                  {tab.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Painel de Conteúdo Direito com Scroll */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {/* TAB 1: EDITOR */}
          {activeTab === 'editor' && (
            <Stack spacing={2.5}>
              <SettingRow
                title={t.editor.autocomplete}
                description={t.editor.autocompleteDesc}
                control={
                  <Switch
                    checked={settings.autoComplete}
                    onChange={(e) => onUpdateSettings({ autoComplete: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.editor.autoCloseBrackets}
                description={t.editor.autoCloseBracketsDesc}
                control={
                  <Switch
                    checked={settings.autoCloseBrackets}
                    onChange={(e) => onUpdateSettings({ autoCloseBrackets: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.editor.wordWrap}
                description={t.editor.wordWrapDesc}
                control={
                  <Switch
                    checked={settings.wordWrap}
                    onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.editor.codeCheck}
                description={t.editor.codeCheckDesc}
                control={
                  <Switch
                    checked={settings.codeCheck}
                    onChange={(e) => onUpdateSettings({ codeCheck: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.editor.nonBlinkingCursor}
                description={t.editor.nonBlinkingCursorDesc}
                control={
                  <Switch
                    checked={settings.nonBlinkingCursor}
                    onChange={(e) => onUpdateSettings({ nonBlinkingCursor: e.target.checked })}
                    color="primary"
                  />
                }
              />
            </Stack>
          )}

          {/* TAB 2: IDIOMA E ORTOGRAFIA */}
          {activeTab === 'language' && (
            <Stack spacing={2.5}>
              <SettingRow
                title={t.language.uiLanguage}
                description={t.language.uiLanguageDesc}
                control={
                  <Select
                    size="small"
                    value={settings.uiLanguage}
                    onChange={(e) =>
                      onUpdateSettings({ uiLanguage: e.target.value as 'pt-BR' | 'en' })
                    }
                    sx={{ minWidth: 170, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                    <MenuItem value="en">English (US)</MenuItem>
                  </Select>
                }
              />

              <Divider />

              <SettingRow
                title={t.language.spellcheck}
                description={t.language.spellcheckDesc}
                control={
                  <Switch
                    checked={settings.spellcheck}
                    onChange={(e) => onUpdateSettings({ spellcheck: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.language.spellcheckLang}
                description={t.language.spellcheckLangDesc}
                control={
                  <Select
                    size="small"
                    value={settings.spellcheckLanguage}
                    disabled={!settings.spellcheck}
                    onChange={(e) =>
                      onUpdateSettings({ spellcheckLanguage: e.target.value as 'pt-BR' | 'en-US' })
                    }
                    sx={{ minWidth: 170, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="pt-BR">{t.language.ptBr}</MenuItem>
                    <MenuItem value="en-US">{t.language.enUs}</MenuItem>
                  </Select>
                }
              />
            </Stack>
          )}

          {/* TAB 3: COMPILADOR */}
          {activeTab === 'compiler' && (
            <Stack spacing={2.5}>
              <SettingRow
                title={t.compiler.engine}
                description={t.compiler.engineDesc}
                control={
                  <Select
                    size="small"
                    value={settings.engine}
                    onChange={(e) =>
                      onUpdateSettings({
                        engine: e.target.value as 'pdflatex' | 'xelatex' | 'lualatex',
                      })
                    }
                    sx={{ minWidth: 150, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="pdflatex">pdfLaTeX</MenuItem>
                    <MenuItem value="xelatex">XeLaTeX</MenuItem>
                    <MenuItem value="lualatex">LuaLaTeX</MenuItem>
                  </Select>
                }
              />

              <Divider />

              <SettingRow
                title={t.compiler.draftMode}
                description={t.compiler.draftModeDesc}
                control={
                  <Switch
                    checked={settings.draftMode}
                    onChange={(e) => onUpdateSettings({ draftMode: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.compiler.stopOnError}
                description={t.compiler.stopOnErrorDesc}
                control={
                  <Switch
                    checked={settings.stopOnError}
                    onChange={(e) => onUpdateSettings({ stopOnError: e.target.checked })}
                    color="primary"
                  />
                }
              />

              <Divider />

              <SettingRow
                title={t.compiler.autoCompile}
                description={t.compiler.autoCompileDesc}
                control={
                  <Switch
                    checked={settings.autoCompile}
                    onChange={(e) => onUpdateSettings({ autoCompile: e.target.checked })}
                    color="primary"
                  />
                }
              />
            </Stack>
          )}

          {/* TAB 4: APARÊNCIA */}
          {activeTab === 'appearance' && (
            <Stack spacing={2.5}>
              <SettingRow
                title={t.appearance.fontSize}
                description="Altera a escala tipográfica do código LaTeX"
                control={
                  <Select
                    size="small"
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: e.target.value as any })}
                    sx={{ minWidth: 120, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="12px">12px</MenuItem>
                    <MenuItem value="13.5px">13.5px</MenuItem>
                    <MenuItem value="15px">15px</MenuItem>
                    <MenuItem value="16.5px">16.5px</MenuItem>
                    <MenuItem value="18px">18px</MenuItem>
                  </Select>
                }
              />

              <Divider />

              <SettingRow
                title={t.appearance.lineHeight}
                description="Espaçamento vertical entre as linhas do editor"
                control={
                  <Select
                    size="small"
                    value={settings.lineHeight}
                    onChange={(e) => onUpdateSettings({ lineHeight: e.target.value as any })}
                    sx={{ minWidth: 150, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="1.4">{t.appearance.lineHeightCompact}</MenuItem>
                    <MenuItem value="1.65">{t.appearance.lineHeightNormal}</MenuItem>
                    <MenuItem value="1.9">{t.appearance.lineHeightRelaxed}</MenuItem>
                  </Select>
                }
              />

              <Divider />

              <SettingRow
                title={t.appearance.invertPdfDark}
                description={t.appearance.invertPdfDarkDesc}
                control={
                  <Switch
                    checked={settings.invertPdfDark}
                    onChange={(e) => onUpdateSettings({ invertPdfDark: e.target.checked })}
                    color="primary"
                  />
                }
              />
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  control: React.ReactNode;
}

function SettingRow({ title, description, control }: SettingRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.2 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>{control}</Box>
    </Box>
  );
}
