import { useState, useEffect } from 'react';

/**
 * Manages Monaco editor preferences (font size, line wrap, minimap, theme)
 * and applies them to the editor instance whenever they change.
 *
 * @param {React.MutableRefObject} editorRef - ref to the Monaco editor instance
 * @param {boolean} editorReady - whether the editor has mounted
 * @returns {{ fontSize, setFontSize, lineWrap, setLineWrap, minimap, setMinimap, theme, setTheme }}
 */
export function useEditorSettings(editorRef, editorReady) {
  const [fontSize, setFontSize] = useState(14);
  const [lineWrap, setLineWrap] = useState('on');
  const [minimap, setMinimap] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Sync theme CSS variable on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Push options into the live editor instance
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize,
        wordWrap: lineWrap,
        minimap: { enabled: minimap },
      });
    }
  }, [fontSize, lineWrap, minimap, editorReady, editorRef]);

  return { fontSize, setFontSize, lineWrap, setLineWrap, minimap, setMinimap, theme, setTheme };
}
