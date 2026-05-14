// Ambient declaration für @mixmark-io/domino — der ausgelieferte Typ
// `declare module 'domino'` matched nicht den Scoped-Package-Pfad, deshalb
// ergänzen wir hier eine lokale Modul-Deklaration.
declare module "@mixmark-io/domino" {
  const domino: {
    createDocument(html?: string, force?: boolean): Document;
    createWindow(html?: string, address?: string): Window;
  };
  export default domino;
}
