Math.log10 = Math.log10 || function(x) {
    return Math.log(x) * Math.LOG10E;
};

var RelationalWord = function(newsResult) {
    this.container = "relational-word-chart";
    this.newsResult = newsResult;
    this.preSearchParams = {};

    this.maxNewsCount = $(".keyword-cnt.selected").data("cnt");
    this.chartType = "cloud";
    this.dataTarget= "weight";

    this.$tableWrap = $("#relational-table-wrap");
    this.tableHeaders = ["분석제외", "키워드", "가중치", "키워드 빈도수"];
    this.tableWidths = ["10%", "40%", '25%', '25%'];

    this.$loader = $(".viz-rel-keywords__loader");

    self.topics = [];

    this.initEvent();
}

RelationalWord.prototype.render = function() {
    var self = this;

    var needSearch = false;

    var resultParams = _.cloneDeep(self.newsResult.getResultParams());
    resultParams.maxNewsCount = self.maxNewsCount;
    resultParams.resultNumber = self.maxNewsCount;

    if (JSON.stringify(resultParams) !== JSON.stringify(self.preSearchParams)) {
        self.preSearchParams = _.cloneDeep(resultParams);
        needSearch = true;
    }

    if (authManager.hasAuth()) {
        $(".keyword-cnt.need-unauth").hide();
        $(".keyword-cnt.need-auth").show();
    } else {
        $(".keyword-cnt.need-auth").hide();
        $(".keyword-cnt.need-unauth").show();

        var start_date = moment(resultParams.endDate).subtract(1, 'month').format("YYYY-MM-DD");
        if (resultParams.startDate < start_date) {
            alert("연관어 분석에서 비회원은 최대 3개월까지 검색이 가능합니다.");
            resultParams.startDate = start_date;
        }
    }
    
    if(self.preSearchParams.indexName == "news_quotation"){
    	//인용문 검색 상태인지 확인
    	self.$loader.hide();
        alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
        $("#analytics-relational-word-tab").blur();
        $("#analytics-preview-tab").click();
    }else if(self.preSearchParams.isNotTmUsable && !self.preSearchParams.isTmUsable){
    	//분석제외 필터 선택 상태인지 확인
    	//연관어분석 워드클라우드 제거
    	var chartId = "#" + self.container;
        $(chartId).html("");
        
        //연관어분석 가중치/빈도수 표 제거
        if(self.$tableWrap.children().length > 0){
        	self.$tableWrap.jexcel('setData', [], false);
        }
        
        self.$loader.hide();
        $("#analytics-relational-word-tab").blur();
		alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
		$("#analytics-preview-tab").click();
	}else{
		if (needSearch) {
			self.$loader.show();
			resultParams.analysisType = "relational_word";
			resultParams.startNo = 1;
			$.ajax({
				url: _contextPath + "/api/analysis/relationalWords.do",
				contentType: "application/json;charset=utf-8",
				dataType: "json",
				method: "POST",
				data: JSON.stringify(resultParams),
				success: function(relationalWordData) {
					if (relationalWordData.topics && relationalWordData.topics.data) {
						self.topics = relationalWordData.topics.data;
						self.$loader.hide();
						
						if (relationalWordData.news && relationalWordData.news.resultList) {
							self.news = relationalWordData.news.resultList;
							self.calcTopicTF();
							
							self.sortTopic();
							self.renderGraph();
						}
					}
				},
				error: function(err) {
					console.log(err);
				}
			});	
			
		    resultParams.sectionDiv = "1000";
		    resultParams.realURI = "/api/analysis/relationalWords.do";
		    self.$loader.show();
		    $.ajax({
		    	url: "/api/news/webloadLogging.do",
		    	method: "POST",
		    	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		    	data: $.param(resultParams),
		    	dataType: "json",
		    	success: function(data) {}
		    });    			
		} else {
			self.sortTopic();
			self.renderGraph();
		}
	}
}

RelationalWord.prototype.renderGraph = function() {
    var self = this;

    if (self.chartType == "cloud") {
        self.renderCloud();
    } else {
        self.renderChart();
    }
}

RelationalWord.prototype.renderChart = function() {
    var self = this;
    self.chartData = _.filter(self.topics, function(t) {
        return !t.isIgnore;
    });

    var categoryField = self.dataTarget;

    var graphs = [{
        "balloonText": "[[category]]: <b>[[value]]</b>",
        "fillAlphas": 0.8,
        "lineAlpha": 0.2,
        "type": "column",
        "valueField": categoryField
    }];

    if (!self.chart) {
        self.chartSetting = {
            "type": "serial",
            "theme": "none",
            "categoryField": "name",
            "startDuration": 0.5,
            "categoryAxis": {
                "gridPosition": "start",
                "labelRotation": 45
            },
            "chartCursor": {
                "cursorAlpha": 0,
                "categoryBalloonEnabled": false
            },
            "trendLines": [],
            "graphs": graphs,
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

        self.chart = AmCharts.makeChart( self.container, chartResult);
    } else {
        self.chartSetting.graphs[0].valueField = self.dataTarget;
        self.chart.graphs = graphs;
        self.chart.dataProvider = self.chartData;
        self.chart.validateData();
    }
}

RelationalWord.prototype.renderCloud = function() {
    var self = this;

    var maxFontSize = 50;
    var minFontSize = 15;
    var minWeight, maxWeight;

    if (self.dataTarget == "weight") {
        minWeight = d3.min(self.topics, function(d) { return d.weight; });
        maxWeight = d3.max(self.topics, function(d) { return d.weight; });
    } else {
        minWeight = d3.min(self.topics, function(d) { return d.tf; });
        maxWeight = d3.max(self.topics, function(d) { return d.tf; });
    }
    var weightRange = maxWeight - minWeight;
    weightRange = weightRange > 0 ? weightRange : 1;
    
    var resizeRatio = (maxFontSize - minFontSize) / weightRange;

    _.forEach(self.topics, function(topic) {
        topic.text = topic.name;
        if (self.dataTarget == "weight") {
            topic.size = minFontSize + (resizeRatio * (topic.weight - minWeight));
        } else {
            topic.size = minFontSize + (resizeRatio * (topic.tf - minWeight));
        }
    });

    var chartId = "#" + self.container;
    $(chartId).html("");
    var width = $(chartId).width();
    var height = 540;
    var data = _.filter(self.topics, function(d) {
        return !d.isIgnore;
    });

    var svg = null;

    d3.layout.cloud().size([width, height]).words(data).rotate(0)
        .font("Noto Sans KR").fontSize(function(d) {
        return d.size;
    }).on("end", function(words) {
        var fill = d3.scale.category20();
        var cloudContainer = chartId;

        svg = d3.select(cloudContainer).append("svg")
            .attr("width", width)
            .attr("height", height);

            svg.append("g")
            .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) {
                return d.size + "px";
            })
            .style("font-family", "Noto Sans KR")
            .style("fill", function(d, i) {
                // TODO: BIGKinds의 고유 색상 활용 필요함
                return fill(i);
            })
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
    }).start();

    self.chart = null;
}

RelationalWord.prototype.calcTopicTF = function () {
    var self = this;

    var tableData = [];
    _.forEach(self.topics, function (topic) {
        var reg = new RegExp(topic.name, "g");
        var topicTF = 0;
        _.forEach(self.news, function(newsItem) {
            var fullContent = [newsItem.TITLE, newsItem.CONTENT].join(" ");
            if (fullContent.match(reg)) {
                topicTF += fullContent.match(reg).length;
            }
        });

        topic.tf = topicTF;
        tableData.push([
            0, topic.name, topic.weight, topic.tf
        ]);
    });

    var columns = [
        { type: "checkbox" },
        { type: "text", readOnly: true },
        { type: "numeric", readOnly: true },
        { type: "numeric", readOnly: true }
    ];

    var table = self.$tableWrap.jexcel({
        colHeaders: self.tableHeaders,
        colWidths: self.tableWidths,
        columns: columns,
        allowInsertColumn: false,
        allowManualInsertColumn: false,
        allowDeleteColumn: false,
        data: tableData,
        onchange: function(obj, cell, val) {
            var cellId = $(cell).prop("id");
            var row = cellId.split("-")[1];

            var rowData = self.$tableWrap.jexcel('getRowData', row);
            var keyword = rowData[1];

            var topic = _.find(self.topics, function(t) {
                return t.name == keyword;
            });

            topic.isIgnore = parseInt(rowData[0]) == 1;

            self.renderGraph();
        }
    });

    self.$tableWrap.find("table").css("width", "auto");
}

RelationalWord.prototype.sortTopic = function() {
    var self = this;
    var tableData = [];

    self.topics = _.orderBy(
        self.topics,
        [self.dataTarget, self.dataTarget=='weight'?'tf':'weight', 'name'],
        ['desc', 'desc', 'asc']
    );

    _.forEach(self.topics, function(topic) {
        tableData.push([
            topic.isIgnore?1:0, topic.name, topic.weight, topic.tf
        ]);
    });
    self.$tableWrap.jexcel('setData', tableData, false);
}

RelationalWord.prototype.initEvent = function() {
    var self = this;

    $(".keyword-cnt").click(function(e) {
        $(".keyword-cnt").removeClass("selected");
        $(this).addClass("selected");
        self.maxNewsCount = $(this).data("cnt");
        self.preSearchParams.maxNewsCount = self.maxNewsCount;

        self.render();
    });

    $(".keyword-chart-type").click(function(e) {
        $(".keyword-chart-type").removeClass("selected");
        $(this).addClass("selected");
        self.chartType = $(this).data("type");
        if (self.chartType == "cloud") {
            $("#wordcloud-download-btn-wrap").show();
        } else {
            $("#wordcloud-download-btn-wrap").hide();
        }

        self.render();
    });

    $(".keyword-target").click(function(e) {
        $(".keyword-target").removeClass("selected");
        $(this).addClass("selected");
        self.dataTarget = $(this).data("target");

        self.render();
    });

    $(".relational-word-download-btn").click(function(e) {
        var tableData = [
            self.tableHeaders
        ];

        _.forEach(self.$tableWrap.jexcel('getData', false), function (row) {
            tableData.push([
                parseInt(row[0])==1?"제외":"", row[1], row[2], row[3]
            ]);
        });

        var wb = XLSX.utils.book_new();
        var sheet = XLSX.utils.aoa_to_sheet(tableData);

        XLSX.utils.book_append_sheet(wb, sheet, "연관어 분석");
        XLSX.writeFile(wb, "연관어분석_" + moment().format("YYYYMMDD") + ".xlsx");

        ga('send', 'event', 'NewsSearch', 'download', 'RelationalWord_KeywordData');
        
        $.ajax({
        	url: "/api/news/downloadLogging.do",
        	method: "POST",
        	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        	data: { categoryCode:"analysis"},
        	dataType: "json",
        	success: function(data) {
        		console.log(data);
        	}
        });
    });

    $(".save-rel-word-modal-btn").click(function(e) {
        if (authManager.checkAuth()) {
            $("#save-rel-word-modal").modal();
        }
    });

    $(".save-rel-word-wordcloud-btn").click(function(e) {
        var width = $("svg").width();
        var height = $("svg").height();

        function getDownloadURL(svg) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var source = svg.parentNode.innerHTML;

            canvg(canvas, source);

            return canvas.toDataURL('image/png');
        }

        function updateDownloadURL(svg, link) {
            var downloadUrl = getDownloadURL(svg);
            var fileName = "연관어분석_" + moment().format("YYYYMMDD") + ".png";
            download(downloadUrl, fileName, "image/png");
        }

        var svg = d3.select("#relational-word-chart svg");
        updateDownloadURL(svg.node(), document.getElementById('download'));

        ga('send', 'event', 'NewsSearch', 'download', 'RelationalWord_WordCloud');
        
        $.ajax({
        	url: "/api/news/downloadLogging.do",
        	method: "POST",
        	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        	data: { categoryCode:"analysis"},
        	dataType: "json",
        	success: function(data) {
        		console.log(data);
        	}
        });
    });

    $(".save-rel-word-btn").click(function(e) {
        var resultParams = self.newsResult.getResultParams();
        var title = $("#rel-word-result-title").val();
        var content = $("#rel-word-content").val();

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
            self.chartData = _.filter(self.topics, function(t) {
                return !t.isIgnore;
            });

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
                shareYn: $("input[name='rel-word-shared']").is(":checked") ? "Y" : "N",
                categoryCode1: $("#trend-result-category-code").val(),
                incidentCategoryCode1: $("#trend-result-incident-code").val(),
                categoryCode2: $("#trend-result-category-code2").val(),
                incidentCategoryCode2: $("#trend-result-incident-code2").val(),
                quotationKeyword1: resultParams.quotationKeyword1,
                quotationKeyword2: resultParams.quotationKeyword2,
                quotationKeyword3: resultParams.quotationKeyword3,
                objCnt: 0,
                graphCondi: self.maxNewsCount
            };

            $.ajax({
                url: _contextPath + "/api/private/analysis/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: function (d) {
                    alert("정상처리 되었습니다. \n 저장결과는 '마이페이지'의 '나의 뉴스분석' 메뉴에서 확인하실 수 있습니다. ");
                    $("#save-rel-word-modal").modal("hide");
                }, error: function(xhr, status, error) {
                    console.log("error");
                    alert("결과 저장 진행중 문제가 발생하였습니다.");
                }
            });
        } else {
            alert("제목을 입력해 주시기 바랍니다.");
        }
    });
}
