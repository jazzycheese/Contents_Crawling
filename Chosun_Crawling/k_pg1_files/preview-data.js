var PreviewData = function(newsResult) {
    this.newsResult = newsResult;
    this.preSearchParams = null;

    this.tableHeaders = [
        "뉴스 식별자", "일자", "언론사", "기고자", "제목",
        "통합 분류1", "통합 분류2", "통합 분류3",
        "사건/사고 분류1", "사건/사고 분류2", "사건/사고 분류3",
        "인물", "위치", "기관", "키워드", "특성추출",
        "본문", "URL", "분석제외 여부"
    ];

    this.quotationTableHeaders = [
        "뉴스 식별자", "일자", "언론사", "정보원",
        "통합 분류1", "통합 분류2", "통합 분류3",
        "사건/사고 분류1", "사건/사고 분류2", "사건/사고 분류3",
        "인용문",
        "키워드",
        "특성추출",
        "분석제외 여부"
    ];

    this.tableWidths = [
        100, 100, 80, 80, 200,
        120, 120, 120,
        120, 120, 120,
        250, 250, 250, 250, 250,
        250, 250, 80
    ];

    this.quotationTableWidths = [
        100, 100, 80, 80,
        100, 100, 100,
        100, 100, 100,
        250, 250, 250, 30
    ];

    this.$loader = $(".viz-preivew > .analysis-viz-loader");
    this.$previewContainer = $("#preview-wrap");

    this.renderPreview();
    this.initEvent();
}

PreviewData.prototype.renderPreview = function () {
    var self = this;
    var resultParams = self.newsResult.getResultParams();
    var needFetch = true;

    if (resultParams.searchKey && self.preSearchParams) {
        if (JSON.stringify(resultParams) === JSON.stringify(self.preSearchParams)) {
            self.preSearchParams = resultParams;
            needFetch = false;
        }
    }

    if (needFetch) {
        self.$loader.show();

        $.ajax({
            url: _contextPath + "/api/news/previewData.do",
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            method: "POST",
            data: JSON.stringify(resultParams),
            success: function (previewData) {
                var tableHeaders = [];
                var tableWidths = [];
                var columns = [];
                var tableData = [];
                var categoryNames = ["", "", ""];
                var incidentNames = ["", "", ""];

                if (resultParams.indexName == "news") {
                    tableHeaders = self.tableHeaders;
                    tableWidths = self.tableWidths;

                    _.forEach(previewData, function(item) {
                        if (item.CATEGORY_NAMES.split(",").length) {
                            _.forEach(item.CATEGORY_NAMES.split(","), function(categoryName, idx) {
                                categoryNames[idx] = categoryName;
                            });
                        }

                        if (item.CATEGORY_INCIDENT_NAMES.split(",").length) {
                            _.forEach(item.CATEGORY_INCIDENT_NAMES.split(","), function(incidentName, idx) {
                                incidentNames[idx] = incidentName;
                            });
                        }

                        var similarityKeywords = [];
                        if (item.TMS_SIMILARITY) {
                            var similarityArr = item.TMS_SIMILARITY.split(" OR ");

                            _.forEach(similarityArr, function(similarityWord) {
                                var keyword = similarityWord.split("^")[0];
                                keyword.replace(/_/g, ' ');
                                similarityKeywords.push(keyword);
                            });
                        }

                        tableData.push([
                            item.NEWS_ID,
                            item.DATE,
                            item.PROVIDER,
                            item.BYLINE,
                            item.TITLE,
                            categoryNames[0],
                            categoryNames[1],
                            categoryNames[2],
                            incidentNames[0],
                            incidentNames[1],
                            incidentNames[2],
                            item.TMS_NE_PERSON.split("\n").join(", "),
                            item.TMS_NE_LOCATION.split("\n").join(", "),
                            item.TMS_NE_ORGANIZATION.split("\n").join(", "),
                            item.TMS_RAW_STREAM.split("\n").join(", "),
                            similarityKeywords.join(", "),
                            item.CONTENT,
                            item.PROVIDER_LINK_PAGE,
                            item.KPF_ABUSING_NEWS
                        ]);
                    });
                } else {
                    tableHeaders = self.quotationTableHeaders;
                    tableWidths = self.quotationTableWidths;

                    _.forEach(previewData, function(item) {
                        if (item.CATEGORY_NAMES.split(",").length) {
                            _.forEach(item.CATEGORY_NAMES.split(","), function (categoryName, idx) {
                                categoryNames[idx] = categoryName;
                            });
                        }

                        if (item.CATEGORY_INCIDENT_NAMES.split(",").length) {
                            _.forEach(item.CATEGORY_INCIDENT_NAMES.split(","), function (incidentName, idx) {
                                incidentNames[idx] = incidentName;
                            });
                        }

                        quotationTableHeaders = [
                            "뉴스 식별자",
                            "일자",
                            "언론사",
                            "정보원",
                            "통합 분류1",
                            "통합 분류2",
                            "통합 분류3",
                            "사건/사고 분류1",
                            "사건/사고 분류2",
                            "사건/사고 분류3",
                            "인용문",
                            "키워드",
                            "특성추출",
                            "분석제외 여부"
                        ];

                        tableData.push([
                            item.NEWS_ID,
                            item.DATE,
                            item.PROVIDER,
                            item.BYLINE,
                            categoryNames[0],
                            categoryNames[1],
                            categoryNames[2],
                            incidentNames[0],
                            incidentNames[1],
                            incidentNames[2],
                            item.TMS_QUOTATION,
                            item.FEATURE,
                            item.KEYWORD
                        ]);
                    });
                }

                _.forEach(tableHeaders, function(headerItem) {
                    columns.push({
                        type: 'text', readOnly:true
                    });
                });

                self.$previewContainer.jexcel({
                    colHeaders: tableHeaders,
                    colWidths: tableWidths,
                    columns: columns,
                    allowInsertColumn: false,
                    allowManualInsertColumn: false,
                    allowDeleteColumn: false,
                    allowInsertRow: false,
                    allowDeleteRow: false,
                    allowManualInsertRow: false,
                    data: tableData
                });
                self.$previewContainer.find("table").css("width", "auto");

                self.$loader.hide();
            },
            error: function (err) {

            }
        });
        
	    resultParams.sectionDiv = "1000";
	    resultParams.realURI = "/api/news/previewData.do";
	    self.$loader.show();
	    $.ajax({
	    	url: "/api/news/webloadLogging.do",
	    	method: "POST",
	    	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
	    	data: $.param(resultParams),
	    	dataType: "json",
	    	success: function(data) {}
	    });         
    }
}

PreviewData.prototype.initEvent = function() {
    var self = this;

    $(".news-download-btn").click(function(e) {
        if (authManager.checkAuth()) {
            if (confirm("뉴스 다운로드를 진행하시겠습니까? 최대 20,000건의 뉴스기사 데이터가 제공됩니다.")) {
                self.$loader.show();

                var resultParams = self.newsResult.getResultParams();
                resultParams.searchKey = resultParams.searchKey.replace(/'/gi, "&apos;");
                
                $.fileDownload(_contextPath + "/api/news/download.do", {
                    jsonData: resultParams,
                    type: "POST",
                    successCallback: function (url) {
                        self.$loader.hide();
                    },
                    failCallback: function (responseHtml, url) {
                        self.$loader.hide();
                        alert("파일다운로드에 실패했습니다.");
                    }
                });

                ga('send', 'event', 'NewsSearch', 'download', 'NewsData');
            }
        }
    });
}