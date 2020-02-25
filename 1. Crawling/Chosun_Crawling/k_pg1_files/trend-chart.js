var TrendChart = function(newsResult) {
    this.chartContainer = "trend-chart";
    this.newsResult = newsResult;
    this.interval = 2;
    this.chartType = "line";
    this.isRotate = false;
    this.dataType = "df";
    this.chartData = [];
    this.$loader = $(".viz-trend > .analysis-viz-loader");

    this.chartColors = [
        "#0D8ECF",
        "#B0DE09",
        "#FCD202",
        "#FF6600",
        "#2A0CD0",
        "#CD0D74",
        "#CC0000",
        "#00CC00",
        "#0000CC",
        "#DDDDDD",
        "#999999",
        "#333333",
        "#990000"
    ];

    this.getTrendData();
    this.initEvent();
}

TrendChart.prototype.setGraphOption = function() {
    var self = this;

    if (self.chartData.length) {
        var firstChartData = self.chartData[0];
        var graphs = [];

        var keys = [];
        _.forEach(Object.keys(firstChartData), function(key){
            if (key !== "date") {
                keys.push(key);
            }
        });

        _.forEach(keys, function(key, idx) {
            var graphObj = {
                title: key,
                balloonText: "[[title]]: <b>[[value]]</b>",
                bullet: "round",
                bulletSize: 10,
                bulletBorderAlpha: 1,
                bulletBorderThickness: 2,
                valueField: key,
                lineColor: self.chartColors[idx]
            };

            switch (self.chartType) {
                case "line":
                    break;
                case "column-rotate":
                case "column":
                    graphObj.type = "column";
                    graphObj.fillAlphas = 0.8;
                    graphObj.lineAlpha = 0.2;
                    break;
                case "area":
                    graphObj.bullet = "round";
                    graphObj.bulletBorderAlpha = 1;
                    graphObj.bulletBorderThickness = 1;
                    graphObj.fillAlphas = 0.8;
                    graphObj.lineColorField = "lineColor";
                    break;
            }
            graphs.push(graphObj);
        });

        self.graphs = graphs;
    }
}

TrendChart.prototype.getTrendData = function() {
    var self = this;

    var resultParams = _.cloneDeep(self.newsResult.getResultParams());
    resultParams.interval = self.interval;

    if (resultParams.searchKey && resultParams.searchKey.split(",").length == 2) {
        self.correlationKeywords = resultParams.searchKey;
        resultParams.searchKey += ", " + resultParams.searchKey.split(",").join(" AND ");
    } else {
        self.correlationKeywords = null;
    }
    resultParams.sectionDiv = "1000";
    resultParams.realURI = "/api/analysis/keywordTrends.do";
    self.$loader.show();
    
    if(resultParams.indexName == "news_quotation"){
    	//인용문 검색 상태인지 확인
    	self.$loader.hide();
        alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
        $("#analytics-trend-tab").blur();
        $("#analytics-preview-tab").click();
    }else if(resultParams.isNotTmUsable && !resultParams.isTmUsable){
    	//분석제외 필터 선택 상태인지 확인
    	if(self.chart){
    		self.chart.clear();
    	}
    	
    	self.$loader.hide();
        alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
        $("#analytics-trend-tab").blur();
        $("#analytics-preview-tab").click();
    }else{
    	$.ajax({
    		url: "/api/news/webloadLogging.do",
    		method: "POST",
    		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    		data: $.param(resultParams),
    		dataType: "json",
    		success: function(data) {}
    	});      
    	
    	$.ajax({
    		url: _contextPath + "/api/analysis/keywordTrends.do",
    		contentType: "application/json;charset=utf-8",
    		dataType: "json",
    		method: "POST",
    		data: JSON.stringify(resultParams),
    		success: function(data) {
    			if (data && data.root && data.root.length) {
    				var chartData = [];
    				var isWeek = $(".trend-week-btn").hasClass("selected");
    				
    				_.forEach(data.root, function (trendData) {
    					_.forEach(trendData.data, function(trendItem, idx) {
    						var chartIdx = idx;
    						if (isWeek) {
    							chartIdx = parseInt(idx / 7);
    						}
    						
    						if (!chartData[chartIdx]) {
    							chartData.push({});
    						}
    						
    						var obj = chartData[chartIdx];
    						if (!obj["date"]) {
    							obj["date"] = trendItem.d;
    						}
    						
    						if (!obj[trendData.keyword]) {
    							obj[trendData.keyword] = 0;
    						}
    						
    						obj[trendData.keyword] += trendItem.c;
    					});
    				});
    				
    				self.chartData = chartData;
    				
    				self.renderChart();
    				
    				self.$loader.hide();
    				
    				var $pearsonRow = $(".correlation-row");
    				$pearsonRow.addClass("hidden");
    				if (resultParams.searchKey) {
    					if (self.correlationKeywords) {
    						$pearsonRow.removeClass("hidden");
    						
    						var params = self.newsResult.getResultParams();
    						params.interval = self.interval;
    						self.getCalcPearsonValues(params);
    					}
    				}
    			}
    		},
    		error: function(err) {
    			alert("데이터를 조회하지 못했습니다.");
    			console.log(err);
    		}
    	});
    	
    }
    
    
}

TrendChart.prototype.getCalcPearsonValues = function(resultParams) {
    var self = this;
    var tempParam = _.cloneDeep(resultParams);
    tempParam.interval = "3";

    $.ajax({
        url: _contextPath + "/api/analysis/keywordTrends.do",
        contentType: "application/json;charset=utf-8",
        dataType: "json",
        method: "POST",
        data: JSON.stringify(tempParam),
        success: function(data) {
            if (data && data.root && data.root.length == 2) {
                var resultData = data.root;
                var item1 = _.map(resultData[0].data, "c");
                var item2 = _.map(resultData[1].data, "c");

                var calcValue = self.pearson([item1, item2], 0, 1);
                $("#pearson-correlation-value").text(calcValue.toFixed(4));
            }
        },
        error: function(err) {
            console.log(err);
        }
    });
}

TrendChart.prototype.initEvent = function() {
    var self = this;

    $(".trend-interval-btn").click(function(e) {
        $(".trend-interval-btn").removeClass("selected");
        $(this).addClass("selected");

        self.interval = $(this).data("interval");
        self.getTrendData();
    });

    $(".trend-chart-btn").click(function(e) {
        $(".trend-chart-btn").removeClass("selected");
        $(this).addClass("selected");

        self.chartType = $(this).data("chart");
        self.isRotate = self.chartType == "column-rotate";

        self.renderChart();
    });

    $(".trend-d-type-btn").click(function(e) {
        $(".trend-d-type-btn").removeClass("selected");
        $(this).addClass("selected");

        self.dataType = $(this).data("dtype");
        self.getTrendData();
    });

    $(".save-trend-modal-btn").click(function(e) {
        if (authManager.checkAuth()) {
            $("#save-trend-modal").modal();
        }
    });

    $(".save-trend-result-btn").click(function(e) {
        var resultParams = self.newsResult.getResultParams();
        var title = $("#trend-result-title").val();
        var content = $("#trend-result-content").val();

        var providerNames = [];
        _.forEach(resultParams.providerCodes, function(code){
            var providerText = $(".provider-btn[data-code='" + code + "']").text().trim();
            providerNames.push(providerText);
        });

        var categoryNames = [];
        _.forEach(resultParams.categoryCodes, function(code){
            var node = self.newsResult.search.detailSearch.categoryTree.getDataById(code);
            categoryNames.push(node.text);
        });

        var incidentNames = [];
        _.forEach(resultParams.incidentCodes, function(code){
            var node = self.newsResult.search.detailSearch.incidentTree.getDataById(code);
            incidentNames.push(node.text);
        });

        if (title) {
            var data = {
                srchwrd: resultParams.searchKey,
                searchStartDate: resultParams.startDate,
                searchEndDate: resultParams.endDate,
                searchProviderCode: resultParams.providerCodes.join(","),
                searchProviderNm: providerNames.join(","),
                searchCategoryPath: resultParams.categoryCodes.join(","),
                searchCategoryNm: categoryNames.join(","),
                searchIncidentCategoryPath: resultParams.incidentCodes.join(","),
                searchIncidentCategoryNm: incidentNames.join(","),
                title: title,
                detailTxt: content,
                chartType: self.chartType,
                chartDataJson: JSON.stringify(self.chartData),
                chartSettingJson: JSON.stringify(self.chartSetting),
                shareYn: $("input[name='trend-result-shared']").is(":checked") ? "Y" : "N",
                categoryCode1: $("#trend-result-category-code").val(),
                incidentCategoryCode1: $("#trend-result-incident-code").val(),
                categoryCode2: $("#trend-result-category-code2").val(),
                incidentCategoryCode2: $("#trend-result-incident-code2").val(),
                quotationKeyword1: resultParams.quotationKeyword1,
                quotationKeyword2: resultParams.quotationKeyword2,
                quotationKeyword3: resultParams.quotationKeyword3,
                objCnt: 0,
                graphCondi: $(".trend-interval-btn.selected").text().trim()
            };

            $.ajax({
                url: _contextPath + "/api/private/analysis/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: function (d) {
                    alert("정상처리 되었습니다. \n 저장결과는 '마이페이지'의 '나의 뉴스분석' 메뉴에서 확인하실 수 있습니다. ");
                    $("#save-trend-modal").modal("hide");
                }, error: function(xhr, status, error) {
                    console.log("error");
                    alert("결과 저장 진행중 문제가 발생하였습니다.");
                }
            });
        } else {
            alert("제목을 입력해 주시기 바랍니다.");
        }
    });

    $(document).on("change", ".trend-chart-color-picker", function(e) {
        var idx = $(this).data("idx");
        var color = $(this).val();

        self.chartColors[idx] = "#" + color;

        self.renderChart(true);
    });
}

TrendChart.prototype.pearson = function(prefs, p1, p2) {
    var si = [];

    for (var key in prefs[p1]) {
        if (prefs[p2][key]) si.push(key);
    }

    var n = si.length;

    if (n == 0) return 0;

    var sum1 = 0;
    for (var i = 0; i < si.length; i++) sum1 += prefs[p1][si[i]];

    var sum2 = 0;
    for (var i = 0; i < si.length; i++) sum2 += prefs[p2][si[i]];

    var sum1Sq = 0;
    for (var i = 0; i < si.length; i++) {
        sum1Sq += Math.pow(prefs[p1][si[i]], 2);
    }

    var sum2Sq = 0;
    for (var i = 0; i < si.length; i++) {
        sum2Sq += Math.pow(prefs[p2][si[i]], 2);
    }

    var pSum = 0;
    for (var i = 0; i < si.length; i++) {
        pSum += prefs[p1][si[i]] * prefs[p2][si[i]];
    }

    var num = pSum - (sum1 * sum2 / n);
    var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) *
        (sum2Sq - Math.pow(sum2, 2) / n));

    if (den == 0) return 0;

    return num / den;
}

TrendChart.prototype.renderChart = function(pickerChanged) {
    var self = this;
    self.setGraphOption();

    self.chartSetting = {
        "type": "serial",
        "theme": "none",
        "categoryField": "date",
        "rotate": self.isRotate,
        "startDuration": 0.5,
        "categoryAxis": {
            "gridPosition": "start",
            "position": "left",
            labelRotation: 30,
        },
        "chartCursor": {
            "categoryBalloonEnabled": true,
            "categoryBalloonColor": "#000",
            "cursorAlpha": 0,
            "zoomable": false
        },
        "trendLines": [],
        "graphs": self.graphs,
        "guides": [],
        "valueAxes": [
            {
                "id": "ValueAxis-1",
                "position": "top",
                "axisAlpha": 0
            }
        ],
        "allLabels": [],
        "balloon": {},
        "titles": [],
        "export": {
            "enabled": true
        }
    };

    var chartResult = _.cloneDeep(self.chartSetting);
    chartResult.dataProvider = self.chartData;

    self.chart = AmCharts.makeChart( "trend-chart", chartResult);
    if (!pickerChanged) {
        self.renderColorPickers();
    }
    self.chart.addListener("clickGraphItem", function(event) {
        var formData = _.cloneDeep(self.newsResult.getResultParams());
        var date = moment(event.item.category);
        var type = $(".trend-interval-btn.selected").text().trim();

        if (type == "일간") {
            var daily_date = date.format("YYYY-MM-DD");
            formData.startDate = daily_date;
            formData.endDate = daily_date;
        } else if (type == "주간") {
            formData.startDate = date.format("YYYY-MM-DD");
            var week_end = date.add('6', 'day').format('YYYY-MM-DD');
            if (week_end < formData.endDate) { formData.endDate = week_end; }
        } else if (type == "월간") {
            var month_date = moment(date).format("YYYYMM");
            var month_begin = moment(month_date).startOf('month').format("YYYY-MM-DD");
            var month_end = moment(month_date).endOf('month').format("YYYY-MM-DD");
            if (month_begin > formData.startDate) { formData.startDate = month_begin; }
            if (month_end < formData.endDate) { formData.endDate = month_end; }
        } else if (type == "연간") {
            var year_begin = date.startOf('year').format('YYYY-MM-DD');
            var year_end = date.endOf('year').format('YYYY-MM-DD');
            if (year_begin > formData.startDate) { formData.startDate = year_begin; }
            if (year_end < formData.endDate) { formData.endDate = year_end; }
        }

        formData.indexName = "news";

        $("#news-search-form-data").val(JSON.stringify(formData));
        $("#news-search-form").attr("target","_blank");
        $("#news-search-form")[0].submit();
    });
}

TrendChart.prototype.renderColorPickers = function() {
    //trend-chart-colors
    var self = this;

    var firstChartData = self.chartData[0];
    var keys = [];

    $("#trend-chart-colors").html("");

    _.forEach(Object.keys(firstChartData), function(key, idx){
        if (key !== "date") {
            var tempIdx = idx - 1;

            $("#trend-chart-colors").append(
                "<div class='form-group'>"
                + "<label>" + key + "</label>"
                + "<input class='jscolor trend-chart-color-picker' value='" + self.chartColors[tempIdx] + "' data-idx='" + tempIdx + "'"
                +    "data-toggle='tooltip' data-placement='top' title='" + key + " 키워드의 그래프 색상(컬러 코드)를 변경하실 수 있습니다.'>"
                + "</div>"
            );
        }
    });

    $(".trend-chart-color-picker").tooltip();

    jscolor.installByClassName("jscolor");
}