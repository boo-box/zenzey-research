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


            // table
            var tableHeaders = [ 
                { sTitle: "Usuario" },
                { sTitle: "Recibidos" },
                { sTitle: "Enviados" },
                { sTitle: "Total" }
            ];

            var tableData = _(nodes).map(function(d) { return [ d.text, d.in, d.out, d.total ] });

            var tableHTML = '<table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered">';

            $.extend( true, $.fn.dataTable.defaults, {
                    "sDom": "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>",
                    "sPaginationType": "bootstrap",
                    "oLanguage": {
                        "sLengthMenu": "_MENU_ records per page"
                    }
                } );


            /* Default class modification */
            $.extend( $.fn.dataTableExt.oStdClasses, {
                    "sWrapper": "dataTables_wrapper form-inline"
                } );


            /* API method to get paging information */
            $.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings )
            {
                return {
                    "iStart":         oSettings._iDisplayStart,
                    "iEnd":           oSettings.fnDisplayEnd(),
                    "iLength":        oSettings._iDisplayLength,
                    "iTotal":         oSettings.fnRecordsTotal(),
                    "iFilteredTotal": oSettings.fnRecordsDisplay(),
                    "iPage":          Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
                    "iTotalPages":    Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
                };
            };


            /* Bootstrap style pagination control */
            $.extend( $.fn.dataTableExt.oPagination, {
                    "bootstrap": {
                        "fnInit": function( oSettings, nPaging, fnDraw ) {
                            var oLang = oSettings.oLanguage.oPaginate;
                            var fnClickHandler = function ( e ) {
                                e.preventDefault();
                                if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
                                    fnDraw( oSettings );
                                }
                            };

                            $(nPaging).addClass('pagination').append(
                                '<ul>'+
                                    '<li class="prev disabled"><a href="#">&larr; '+oLang.sPrevious+'</a></li>'+
                                    '<li class="next disabled"><a href="#">'+oLang.sNext+' &rarr; </a></li>'+
                                    '</ul>'
                            );
                            var els = $('a', nPaging);
                            $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
                            $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );
                        },

                        "fnUpdate": function ( oSettings, fnDraw ) {
                            var iListLength = 5;
                            var oPaging = oSettings.oInstance.fnPagingInfo();
                            var an = oSettings.aanFeatures.p;
                            var i, j, sClass, iStart, iEnd, iHalf=Math.floor(iListLength/2);

                            if ( oPaging.iTotalPages < iListLength) {
                                iStart = 1;
                                iEnd = oPaging.iTotalPages;
                            }
                            else if ( oPaging.iPage <= iHalf ) {
                                iStart = 1;
                                iEnd = iListLength;
                            } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
                                iStart = oPaging.iTotalPages - iListLength + 1;
                                iEnd = oPaging.iTotalPages;
                            } else {
                                iStart = oPaging.iPage - iHalf + 1;
                                iEnd = iStart + iListLength - 1;
                            }

                            for ( i=0, iLen=an.length ; i<iLen ; i++ ) {
                                // Remove the middle elements
                                $('li:gt(0)', an[i]).filter(':not(:last)').remove();

                                // Add the new list items and their event handlers
                                for ( j=iStart ; j<=iEnd ; j++ ) {
                                    sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
                                    $('<li '+sClass+'><a href="#">'+j+'</a></li>')
                                    .insertBefore( $('li:last', an[i])[0] )
                                    .bind('click', function (e) {
                                            e.preventDefault();
                                            oSettings._iDisplayStart = (parseInt($('a', this).text(),10)-1) * oPaging.iLength;
                                            fnDraw( oSettings );
                                        } );
                                }

                                // Add / remove disabled classes from the static elements
                                if ( oPaging.iPage === 0 ) {
                                    $('li:first', an[i]).addClass('disabled');
                                } else {
                                    $('li:first', an[i]).removeClass('disabled');
                                }

                                if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
                                    $('li:last', an[i]).addClass('disabled');
                                } else {
                                    $('li:last', an[i]).removeClass('disabled');
                                }
                            }
                        }
                    }
                } );


            $('#data-table').html(tableHTML);
            $('#data-table table').dataTable( {
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
                    "aoColumns": tableHeaders
                } );    

        }


    exports.app = app;

}(window);
