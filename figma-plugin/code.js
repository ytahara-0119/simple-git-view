// 絶対最小テスト: テキストもフォントロードも使わない
const rect = figma.createRectangle();
rect.resize(300, 200);
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; // 真っ赤
rect.x = 0;
rect.y = 0;
figma.currentPage.appendChild(rect);
figma.viewport.scrollAndZoomIntoView([rect]);
figma.closePlugin('完了');
