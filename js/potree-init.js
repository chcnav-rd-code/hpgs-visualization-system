function initPotree(domId, callback) {
  if (!domId) {
    return;
  }
  window.potreeViewer = new Potree.Viewer(document.getElementById(domId), {
    useDefaultRenderLoop: false,
  });
  potreeViewer.setEDLEnabled(true);
  potreeViewer.setFOV(60);
  potreeViewer.setPointBudget(3_000_000);
  potreeViewer.setMinNodeSize(30);
  potreeViewer.loadSettingsFromURL();
  potreeViewer.setBackground(null);
  potreeViewer.useEDL = false;
  potreeViewer.compass.setVisible(true);

  potreeViewer.setControls(potreeViewer.earthControls);

  callback(potreeViewer);
}
