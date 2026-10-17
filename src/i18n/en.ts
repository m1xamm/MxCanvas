export const en = {
  toolbarLabel: 'Tools',
  panelsLabel: 'Panels',
  mainMenuLabel: 'Main menu',
  settings: 'Settings',
  closeLabel: 'Close',
  file: 'File',
  design: 'Design',
  pages: 'Pages',
  layers: 'Layers',
  assets: 'Assets',
  pageName: 'Page 1',
  noLayers: 'No layers yet',
  noAssets: 'No assets yet',
  languageLabel: 'Language',
  languages: {
    ru: 'Русский',
    en: 'English',
  },
  zoomLabel: 'Zoom',
  tools: {
    move: 'Move',
    frame: 'Frame',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    line: 'Line',
    pen: 'Pen',
    text: 'Text',
    hand: 'Hand',
  },
  shapes: {
    rectangle: 'Rectangle',
  },
  sections: {
    position: 'Position',
    layout: 'Layout',
    appearance: 'Appearance',
    fill: 'Fill',
    stroke: 'Stroke',
    effects: 'Effects',
    export: 'Export',
  },
}

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

export type Dictionary = Widen<typeof en>
