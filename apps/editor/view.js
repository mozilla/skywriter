var SC = require('sproutcore/runtime:package').SC;
// var EditorView = require("bespin:editor/views/editor").EditorView;

exports.app = SC.Application.create({
    NAMESPACE: "bespin"
});

exports.app.mainPage = SC.Page.design({

  // The main pane is made visible on screen as soon as your app is loaded.
  // Add childViews to this pane for views to display immediately on page 
  // load.
  mainPane: SC.MainPane.design({
      childViews: 'labelView'.w(),

      labelView: SC.LabelView.design({
        layout: { centerX: 0, centerY: 0, width: 200, height: 18 },
        textAlign: SC.ALIGN_CENTER,
        tagName: "h1", 
        value: "Welcome to SproutCore!"
      })
  })

});
