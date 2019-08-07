var cyGraph = {
  init: function(element, customTooltipFunc) {
    var attrData       = $.extend({}, $(element).data())

    var data           = attrData.dataset        ? eval(attrData.dataset) : []
    var options        = attrData.options        ? eval('(' + attrData.options + ')') : {}

    cy =  cytoscape({
      // very commonly used options
      container: element,
      elements: [/* ... */ ],
      style: [ /* ... */ ],
      layout: { /* ... */},
  
      // initial viewport state:
      zoom: 0.95,
      pan: { x: 0, y: 0 },
  
      // interaction options:
      zoomingEnabled: true,
      userZoomingEnabled: false,
      panningEnabled: true,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      selectionType: 'single',
      touchTapThreshold: 8,
      desktopTapThreshold: 4,
      autolock: false,
      autoungrabify: true,
      autounselectify: false,
      
  
      // rendering options:
      headless: false,
      styleEnabled: true,
      hideEdgesOnViewport: false,
      hideLabelsOnViewport: false,
      textureOnViewport: false,
      motionBlur: false,
      motionBlurOpacity: 0.2,
      pixelRatio: 'auto'
    })

    layout_options = {
      name: 'grid',
      position: function( node ){ return {row: node.data('pos')[0],
                                          col: node.data('pos')[1]}}, // returns { row, col } for element
      fit: true, // whether to fit the viewport to the graph
      padding: 0, // padding used on fit
      boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
      avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
      avoidOverlapPadding: 10, // extra spacing around nodes when avoidOverlap: true
      nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
      spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
      condense: false, // uses all available space on false, uses minimal space on true
      rows: options.numRows ? options.numRows : 0, // force num of rows in the grid
      cols: options.numCols ? options.numCols : 0, // force num of columns in the grid
      sort: undefined, // a sorting function to order the nodes; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
      animate: false, // whether to transition the node positions
      animationDuration: 300, // duration of animation in ms if enabled
      animationEasing: undefined, // easing of animation if enabled
      animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
      ready: undefined, // callback on layoutready
      stop: undefined, // callback on layoutstop
      transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts 
    };
    // Get a hook to inject new layouts
    cy["myLayout"] = layout_options

    cyGraph.arange(cy, data, options)

    cy.on("tap", function(event) {
        try {
            customTooltipFunc(event, element)
        } catch {
            console.log("cyGraph.customTooltipFunc error")
        }
    }); 

    // Make Graph responsive and plant the volatile layout
    cy["redraw"] = () => {
      cy.resize()
      cy.fit()
      cy.layout(cy["myLayout"]).run()
    }

    $(window).resize(cy["redraw"])
    $(document).on('redraw.bs.charts', cy["redraw"])

    cy["redraw"]()
    
    return cy
  },


  update: (handle, data, options) => {
    handle.elements().remove()
	handle["myLayout"] = $.extend(cy["myLayout"], {
      rows: options.numRows ? options.numRows : 0, 
      cols: options.numCols ? options.numCols : 0, 
    })
    cyGraph.arange(handle, data, options)
    
    handle["redraw"]();
  },
  
  updateColor: (handle, data, options) => {
    // Colorize node according to the avg weight if available
    if (options.nodeWeights != undefined) {
        data.forEach((vec,i) => {
            let weight_avg = options["nodeWeights"][i]
            let color_select = ['rgb(245, 100, 10)', 'rgb(66,165,245)']
            let color = (weight_avg>=0) ? color_select[1] : color_select[0]
            let opacity = (weight_avg<0) ? -weight_avg : weight_avg;
            opacity = (opacity>1) ? 1 : opacity
            handle.nodes('[id = "'+vec.toString()+'"]').style('background-color', color);
            handle.nodes('[id = "'+vec.toString()+'"]').style('background-opacity', opacity.toString());
        })
    }
    handle["redraw"]();
  },


  arange: (handle, data, options) => {
    // Nodes
    handle.add(data.map((vec, i) => {
        return { group: 'nodes', data: { id: vec.toString(), pos: vec}}
    }))
    
    // Edges
    data.forEach((element, i) => {
      let sourcePos = element.toString()
      let targetRow = (element[0] + 1).toString()
      if (element[0] < options.numRows - 2) {
        for(j=0; j<options.numCols; j++) {
          handle.add({
            group: 'edges',
            data: {
              id: [element, [targetRow, j]].toString(),
              source: sourcePos,
              target: targetRow+","+j.toString()
            }
          })
        }
      } else if (element[0] == (options.numRows - 2)) {
        target = [options.numRows - 1, Math.floor(options.numCols / 2)]
        handle.add({
          group: 'edges',
          data: {
            id: [element, target].toString(),
            source: sourcePos,
            target: target.toString()
          }
        })
      }
    });

    handle.style()
      .clear() // start a fresh stylesheet without even the default stylesheet
  
      // define all basic styles for node
      .selector('node')
      .style({
          //'content': "data(id)",
          'background-color': 'rgb(66,165,245)',
          'background-opacity': 0.1,
          'border-width': '1',
          'border-color': '#42a5f5'
      })//'rgba(125,92,244,1)') #9F86FF
      // define all basic styles for edge
      .selector('edge')
          .style({
          'width': 1,
          'line-color': 'rgb(125,92,244)',
          'opacity': '0.2'
      })
      .selector(':selected')
      .style({
          'background-color': 'rgb(50,50,50)',
          'background-opacity': 0.9,
          'border-width': '2',
          'border-color': '#42a5f5'
      })
      // ...
  
      .update() // indicate the end of your new stylesheet so that it can be updated on elements
    ;
  },
}