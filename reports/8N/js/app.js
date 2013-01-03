;!function(exports) {

    var TOOLTIP = "<div>usuario: @{{ text }}</div><div>enviados: {{ out }}</div><div>recibidos: {{ in }}</div><div>total: {{ total }}</div>"

    // App generator function
    function app(data) {
        var nodes = data[0],
            links = data[1],
            $el = $("#parent"),
            $slider = $("#count-slider"),
            $search = $("#name-search"),
            $clusterButtons = $("#cluster-buttons");

        var min, max;

        exports.graph = new InsightsGraph($el.get(0), nodes, links, {
                width: $el.width(),
                height: $el.height(),
                sizeAttr: "total",
                collisionAlpha: 15,
                tooltipTemplate: TOOLTIP,
                onReset: function() {
                    $slider.rangeSlider("values", min, max);
                    $search.val("");
                    $clusterButtons.find(".active").removeClass("active");
                },
                onRendered: function() {
                    $("#loading").hide();
                }
            });

        min = 0; max = graph.max.size + 10;

        var sliderValues = {};
        $slider.rangeSlider({ 
                arrows: false,
                step: 10, 
                formatter: function(val) {
                    return val + " interacciones";
                },
                bounds: { 
                    min: min,
                    max: max,
                }, 
                defaultValues: { 
                    min: min,
                    max: max
                } 
            }).on("valuesChanged", function(e, data) {                                 
                    var vals = sliderValues;                                         

                    if (vals.max !== data.values.max || vals.min !== data.values.min) { 
                        graph.selectBy(function(d) {
                                return d.total > data.values.min && d.total < data.values.max;
                            });
                    }                                                                      

                    sliderValues = data.values;                                      
                });

            $("#name-search").keyup(function(ev) {
                    var val, ch,
                    $el = $(this);

                    if (ev.keyCode == 27) { // key: esc
                        graph.reset();
                        $el.val("");
                        return;
                    }

                    val = $el.val();
                    ch = String.fromCharCode(ev.keyCode || ev.charCode);

                    ch && graph.selectByText(val);
                });

            $("#zoom-in").click(function(ev) {
                    ev.preventDefault();ev.stopPropagation();
                    graph.zoomIn();
                });

            $("#zoom-out").click(function(ev) {
                    ev.preventDefault();ev.stopPropagation();
                    graph.zoomOut();
                });


            _(graph.getClusters()).each(function(v, k) {
                $clusterButtons.append($("<button>").attr("type", "button")
                                                    .addClass("btn btn-primary")
                                                    //.text(k)
                                                    .attr("rel", "tooltip")
                                                    .attr("data-original-title", "cluster " + k)
                                                    .attr("data-placement", "bottom")
                                                    .data("cluster", k)
                                                    .css({ background: v }));
            });

            $clusterButtons.find("[rel=tooltip]").tooltip();
            $clusterButtons.button();
            $clusterButtons.delegate("button", "click", function(e) {
                $cur = $(this);
                setTimeout(function() {
                        var sel = $.map($clusterButtons.find(".active"), function(el) {
                                return $(el).data("cluster");
                            });
    
                        if (sel.length) {
                            graph.selectByCluster(sel);
                        } else {
                            graph.reset();
                        }
                }, 0);
            });
        }

    exports.app = app;
}(window);
