var InsightsGraph = require("insights"),
    _ = require("underscore"),
    notify = require('notification'),
    twitter = require("twitter-text");

var TOOLTIP = "<div>usuario: @{{text}}</div><div>enviados: {{out}}</div><div>recibidos: {{in}}</div><div>total: {{total}}</div>"

// App generator function
function app(data) {
    var nodes = data[0],
        links = data[1],
        $el = $("#parent"),
        $slider = $("#count-slider"),
        $search = $("#name-search"),
        $clusterButtons = $("#cluster-buttons");

    var min, max;

    graph = new InsightsGraph($el.get(0), nodes, links, {
            width: $el.width(),
            height: $el.height(),
            sizeAttr: "total",
            collisionAlpha: 15,
            initialScale: 0.5,
            tooltipTemplate: TOOLTIP
        });

    graph.on("rendered", function(n) {
        $("#loading").hide();
    });

    graph.on("reset", function(n) {
        selectedNode = null;
        hideNotification();
        $slider.rangeSlider("values", min, max);
        $search.val("");
        dataTable.fnFilter("")
        $clusterButtons.find(".active").removeClass("active");
    });

    graph.on("focus", function(n) {
        showTweets(n.text);
    });

    graph.on("node:click", function(n) {
        dataTable.fnFilter(n.text);
    });

    graph.on("node:mouseover", function(n) {
        if (!window.selectedNode) return;
        var tweet = selectedNode.rcvd[n.text];
        if (!tweet) return;
        $("#insights-tooltip").append("<br />").append($("<div>").css({fontWeight:"bold"}).text("Mención a @" + graph.selectedNode.text + ":"));
        $("#insights-tooltip").append($("<div>").css({maxWidth: 250}).text(tweet));
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

                if (vals.min == null || vals.max == null) {
                    sliderValues = data.values;
                    return;
                }

                if (vals.max !== data.values.max || vals.min !== data.values.min) { 
                    graph.selectBySize(data.values.min, data.values.max);
                }                                                                      

                sliderValues = data.values;                                      
            });

        $(".form-search").submit(function(ev) {
            var val;

            ev.stopPropagation();ev.preventDefault();

            val = $("#name-search").val();

            setTimeout(function() {
                selectNode(val);
                graph.center();
            }, 1000);

            setTimeout(function() {
                dataTable.fnFilter(val);
            }, 1000);
        });

        $("#name-search").keyup(function(ev) {
                var val, ch,
                $el = $(this);

                if (ev.keyCode == 27) { // key: esc
                    graph.reset();
                    $el.val("");
                    dataTable.fnFilter("")
                    return;
                }

                val = $el.val();
                ch = String.fromCharCode(ev.keyCode || ev.charCode);

                setTimeout(function() {
                    ch && graph.selectByText(val);
                }, 0);

                setTimeout(function() {
                    ch && dataTable.fnFilter(val);
                }, 0);
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


        // table
        var tableHeaders = [ 
            { sTitle: "Usuario" },
            { sTitle: "Cluster" },
            { sTitle: "Recibidos" },
            { sTitle: "Enviados" },
            { sTitle: "Total" }
        ];

        var tableData = _(nodes).map(function(d) { return [ d.text, d.cluster, d.in, d.out, d.total ] });

        var dataTable = $('#data-table table').dataTable({
                "aaSorting": [[ 4, "desc" ]],
                "sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
                "sPaginationType": "bootstrap",
                "oLanguage":{
                    "sProcessing":     "Procesando...",
                    "sLengthMenu":     "Mostrar _MENU_ registros",
                    "sZeroRecords":    "No se encontraron resultados",
                    "sEmptyTable":     "Ningún dato disponible en esta tabla",
                    "sInfo":           "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
                    "sInfoEmpty":      "Mostrando registros del 0 al 0 de un total de 0 registros",
                    "sInfoFiltered":   "(filtrado de un total de _MAX_ registros)",
                    "sInfoPostFix":    "",
                    "sSearch":         "Buscar:",
                    "sUrl":            "",
                    "sInfoThousands":  ",",
                    "sLoadingRecords": "Cargando...",
                    "oPaginate": {
                        "sFirst":    "Primero",
                        "sLast":     "Último",
                        "sNext":     "Siguiente",
                        "sPrevious": "Anterior"
                    },
                    "fnInfoCallback": null,
                    "oAria": {
                        "sSortAscending":  ": Activar para ordernar la columna de manera ascendente",
                        "sSortDescending": ": Activar para ordernar la columna de manera descendente"
                    }
                }, 
                "aaData": tableData,
                "aoColumns": tableHeaders,
                "aoColumnDefs": [ 
                    { 
                        "aTargets": [0], 
                        "sType": "html", 
                        "fnRender": function(o, val) { 
                            var user = o.aData[0];
                            var $a = $("<a>")
                                .attr("onclick", 
                                      "javascript:selectNode('$U', 1)".replace("$U", user))
                                .attr("href", "#").html("@" + user);
                            var $img = $("<img>").attr("class", "img-rounded")
                                                 .css({ width: 30, height: 30 })
                                                 .attr("src", "https://api.twitter.com/1/users/profile_image/" + user);
                            var $parent = $("<div>");

                            return $parent.append($img)
                                          .append("  ")
                                          .append($a)
                                          .html();
                        } 
                    }
                ]
            });    
    }

    prevNotification = null;
    hideNotification = function() {
        prevNotification && prevNotification.remove();
    }

    showTweets = function(screenName) {
        var $wrapper = $("<div>").css({
                width: 350,
                height: 300,
                marginTop: 10,
                overflow: "scroll"
            }).html("Cargando..");
        var title = "Tweets enviados por @" + screenName;
        hideNotification();
        prevNotification = notify(title, $wrapper).sticky();

        $.getJSON("data/accounts/" + screenName, function(data) {
            var tweets = _(data.sent).isArray() ? data.sent : [];
            var $list;

            window.selectedNode = data;

            if (tweets.length) {
                $list = $.map(tweets, function(t) {
                    return $("<li>").addClass("media").html(twitter.autoLink(t, { onclick: "window.open(this.href, '_blank');window.focus()" }));
                });
            } else {
                $list = "Sin tweets";
            }

            var $el = $("<ol>").addClass("media-list").html($list); 

            $wrapper.html($el);
        });
    }

    selectNode = function(screenName, center) {                    
        graph.selectByTextExact(screenName);
        center && graph.center();
    }

module.exports = app;
