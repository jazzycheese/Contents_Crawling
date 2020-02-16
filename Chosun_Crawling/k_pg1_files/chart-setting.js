var relChartWidth = $(".container").width() - 30;

var relChart = new NetChart({
    advanced: {
        useAnimationFrame: false
    },
    container : document.getElementById("network-chart-container"),
    area: {
        width: relChartWidth,
        height: 776
    },
    interaction : {
        zooming : {
            wheel: false
        },
        selection : {
            linksSelectable : false,
            tolerance : 5
        }
    },
    layout : {
        nodeSpacing : 5,
    },
    navigation : {
        initialNodes : [ "ROOT" ]
    },
    toolbar: {
        enabled: false
    },
    auras: {
        overlap: true
    },
    style: {
        scaleObjectsWithZoom : false, // Node 배치(position) 설정
        nodeLabel:{
            padding: 4,
            borderRadius: 4,
            textStyle:{font:"14px Noto Sans KR", fillColor: "black"},
            backgroundStyle:{fillColor:"rgba(255, 255, 255, 0)"},
            scaleWithZoom: false,
            scaleWithSize: false
        },
        nodeAutoScaling : "logaritmic",
        nodeRadiusExtent : [10, 30],
        nodeLabelScaleBase : 10,
        node: {
            fillColor: "#fff"
        }, nodeLocked: {
            anchorMode: 2 // Fixed = 2, Floating = 0, Scene = 1,
        },link: {
            fillColor: "#ddd"
        }, nodeStyleFunction : function(node) {
            // node.data.weight = parseInt(Math.log10(node.data.weight * 10) * 4);
            // node.radius += node.data.weight;
            node.label = node.data.label_ne || node.data.title || "";

            if(node.data.weight < 5 ) {
                node.radius =  0.637 * node.data.weight + 5;
            } else if(node.data.weight < 20 ) {
                node.radius =  0.632 * node.data.weight + 10;
            } else if(node.data.weight >= 20 && node.data.weight < 100  ) {
                node.radius = 0.0625 * node.data.weight + 20;
            } else if(node.data.weight >= 100 && node.data.weight < 150 ) {
                node.radius = 0.06 * node.data.weight + 24;
            } else if(node.data.weight >= 150 ) {
                node.radius = 33;
            }

            if (node.data.category == "ROOT") { // TODO: BIGKinds의 고유 색상 활용 필요함
                node.label = "검색어";
                node.fillColor = "#0D3860";
            } else if (node.data.category == "PERSON") {
                node.fillColor = "#8C5226";
            } else if (node.data.category == "LOCATION") {
                node.fillColor = "#42C697";
            } else if (node.data.category == "ORGNIZATION") {
                node.fillColor = "#029ECE";
            } else if (node.data.category == "KEYWORD") {
                node.fillColor = "#F5A623";
            } else if (node.data.category == "NEWS") {
                node.fillColor = "#337ab7";
            } else if (node.data.category == "COMPANY") {
                node.fillColor = "#1565C0";
            } else if (node.data.category == "PRODUCT") {
                node.fillColor = "#D9534F";
            } else {
                node.fillColor = "#aaa";
            }
        }
    }
});