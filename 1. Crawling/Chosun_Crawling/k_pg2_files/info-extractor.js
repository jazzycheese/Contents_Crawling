var InfoExtractor = function() {
    this.defaultInfoPatternItem = {
        infoPatternIdx: 0,
        pattern: 0,
        expression: "",
        isAny: true,
        isRendered: false
    };

    this.defaultInfoPattern = {
        colName: "",
        isRendered: false,
        items: [_.clone(this.defaultInfoPatternItem)]
    };

    this.infoPatternList = [_.cloneDeep(this.defaultInfoPattern)];

    this.$totalExpression = $("#pattern-extract-expression");
    this.extractFormTemplate = Handlebars.getTemplate("analysis/extract-info-pattern-row");
    this.$extractFormWrap = $("#extract-patterns-wrap");
    this.extractItemTemplate = Handlebars.getTemplate("analysis/extract-info-pattern-item");
    this.$extractDesc = $("#extract-patterns-desc");
    this.extractResultTemplate = Handlebars.getTemplate("analysis/extract-info-result");
    this.$extractResulWrap = $("#extract-info-result");

    this.myPatternsTemplate = Handlebars.getTemplate("analysis/my-pattern-list");

    this.$loader = $(".extract-info__loader");

    this.renderFormRows();
    this.initEvent();
}

InfoExtractor.prototype.setSearchParams = function(params) {
    var self = this;

    self.resultParams = params;
    
    var exceptNewsIds = "";
	if(params.exceptNewsIds != "" && params.exceptNewsIds != null){
		self.resultParams.exceptNewsIds = self.resultParams.exceptNewsIds.join();
	}
}

InfoExtractor.prototype.renderFormRows = function() {
    var self = this;

    _.forEach(self.infoPatternList, function(infoPattern, idx) {
        if (!infoPattern.isRendered) {
            var extractFormHtml = self.extractFormTemplate({
                seq: idx,
                patterns: InfoExtractor.PATTERNS,
                infoPattern: infoPattern
            });

            self.$extractFormWrap.append(extractFormHtml);
            infoPattern.isRendered = true;
        }

        self.renderRowItems(infoPattern, idx);
    });
}

InfoExtractor.prototype.renderRowItems = function(infoPattern, infoPatternIdx) {
    var self = this;

    _.forEach(infoPattern.items, function(item, idx) {
        if (!item.isRendered) {
            var $itemsWrap = $(".extract-pattern-items[data-seq='" + infoPatternIdx + "']");

            var extractItemHtml = self.extractItemTemplate({
                seq: infoPatternIdx,
                subseq: idx,
                patterns: InfoExtractor.PATTERNS,
                item: item,
                isDirectInput: InfoExtractor.PATTERNS[item.pattern].isDirectInput
            });

            $itemsWrap.append(extractItemHtml);

            item.isRendered = true;
        }
    });

    self.displayExpression();
}

InfoExtractor.prototype.renderExtractResult = function() {
    var self = this;

    var additionalInfos = [];
    _.forEach($("input[name='extract-info-extra']:checked"), function(checkedInfo) {
        additionalInfos.push($(checkedInfo).val());
    });

    var skipIndices = [];
    if (additionalInfos.indexOf("provider") < 0) {
        skipIndices.push(0);
    }
    if (additionalInfos.indexOf("date") < 0) {
        skipIndices.push(1);
    }
    if (additionalInfos.indexOf("sentence") < 0) {
        skipIndices.push(self.extractResultHeader.length - 1);
    }

    self.extractResultHeader[0] = "언론사";
    self.extractResultHeader[1] = "날짜";
    self.extractResultHeader[self.extractResultHeader.length - 1] = "문장";

    var extractResultHtml = self.extractResultTemplate({
        skipIndices: skipIndices,
        headers: self.extractResultHeader,
        rows: self.extractResult
    });

    self.$extractResulWrap.html(extractResultHtml);
}

InfoExtractor.prototype.displayExpression = function() {
    var self = this;

    var expressions = [];
    var descExpressions = [];

    _.forEach(self.infoPatternList, function(infoPattern, idx) {
        if (infoPattern.colName) {
            var hasExpression = false;
            var subExpressions = [];
            _.forEach(infoPattern.items, function(item) {
                if (item.expression || item.directInput) {
                    hasExpression = true;
                    var expressinVal = item.expression;
                    if (item.directInput) {
                        expressinVal += item.directInput;
                    }
                    subExpressions.push(expressinVal);

                    if (item.isAny) {
                        subExpressions.push("'ANY'");
                    }
                }
            });

            if (hasExpression) {
                expressions.push(infoPattern.colName + "=" + subExpressions.join(" "));

                var descArr = [];
                descArr.push("항목" + (idx + 1) + "-");
                descArr.push(infoPattern.colName + "(은/는)");
                descArr.push("기사에서 ");

                var descItemArr = [];
                _.forEach(infoPattern.items, function (item, itemIdx) {
                    if (item.expression || item.directInput) {
                        var pattern = InfoExtractor.PATTERNS[item.pattern];
                        if (pattern.isDirectInput) {
                            descItemArr.push(item.directInput);
                        } else {
                            descItemArr.push(pattern.label);
                        }
                    }
                });

                descArr.push(descItemArr.join(", "));
                descArr.push("(을/를)을 전부 포함한다");

                descExpressions.push(descArr.join(" "));
            }
        }
    });

    self.$totalExpression.val(expressions.join(" "));
    self.$extractDesc.html(descExpressions.join("<br/>"));
}

InfoExtractor.prototype.initEvent = function() {
    var self = this;

    $(document).on("click", ".add-info-pattern", function(e) {
        self.infoPatternList.push(_.cloneDeep(self.defaultInfoPattern));
        self.renderFormRows();
    });

    $(document).on("click", ".add-extract-item", function(e) {
        var infoPatternIdx = $(this).data("seq");
        var infoPattern = self.infoPatternList[infoPatternIdx];
        var infoPatternItem = _.clone(self.defaultInfoPatternItem);
        infoPatternItem.infoPatternIdx = infoPatternIdx;
        infoPattern.items.push(infoPatternItem);

        self.renderRowItems(infoPattern, infoPatternIdx);
    });

    $(document).on("keypress", ".extract-info-title", function(e) {
        if (e.which === 32) {
            e.preventDefault();
            alert("항목명에 빈칸을 입력할 수 없습니다.");
        }
    });

    $(document).on("keyup", ".extract-info-title", function(e) {
        var infoPatternIdx = $(this).data("seq");
        var infoPattern = self.infoPatternList[infoPatternIdx];

        infoPattern.colName = $(this).val();
        self.displayExpression();
    });

    $(document).on("keyup", ".extract-info-direct-pattern", function(e) {
        var infoPatternIdx = $(this).data("seq");
        var infoPatternItemIdx = $(this).data("subseq");
        var infoPatternItem = self.infoPatternList[infoPatternIdx].items[infoPatternItemIdx];

        infoPatternItem.directInput = $(this).val();
        self.displayExpression();
    });

    $(document).on("change", "input[name='extract-info-any-option']", function(e) {
        var infoPatternIdx = $(this).data("seq");
        var infoPatternItemIdx = $(this).data("subseq");
        var infoPatternItem = self.infoPatternList[infoPatternIdx].items[infoPatternItemIdx];

        infoPatternItem.isAny = !$(this).is(":checked");
        self.displayExpression();
    });

    $(document).on("change", ".extract-info-pattern-type", function(e) {
        var infoPatternIdx = $(this).data("seq");
        var infoPatternItemIdx = $(this).data("subseq");
        var infoPatternItem = self.infoPatternList[infoPatternIdx].items[infoPatternItemIdx];

        var pattern = InfoExtractor.PATTERNS[$(this).val()];
        infoPatternItem.pattern = $(this).val();
        infoPatternItem.expression = pattern.expression;

        var $directInputWrap = $(".extract-info-direct-wrap[data-seq='" + infoPatternIdx + "'][data-subseq='" + infoPatternItemIdx +"']");
        if (InfoExtractor.PATTERNS[infoPatternItem.pattern].isDirectInput) {
            $directInputWrap.show();
        } else {
            delete infoPatternItem.directInput;
            $directInputWrap.hide();
        }
        self.displayExpression();
    });

    $(document).on("click", ".remove-extract-row", function(e){
        e.preventDefault();

        var infoPatternIdx = $(this).data("seq");
        self.infoPatternList.splice(infoPatternIdx, 1);

        _.forEach(self.infoPatternList, function(infoPattern) {
            infoPattern.isRendered = false;

            _.forEach(infoPattern.items, function (item) {
                item.isRendered = false;
            });
        });

        self.$extractFormWrap.html("");
        self.renderFormRows();
    });

    $(document).on("click", ".remove-extract-item", function(e){
        e.preventDefault();

        var infoPatternIdx = $(this).data("seq");
        var infoPatternItemIdx = $(this).data("subseq");

        var infoPattern = self.infoPatternList[infoPatternIdx];
        infoPattern.items.splice(infoPatternItemIdx, 1); //Item 삭제

        //재 정렬된 Item 기준으로 새로이 render 수행
        _.forEach(infoPattern.items, function(item) {
            item.isRendered = false;
        });

        var $row = $(".extract-info__pattern-row[data-seq='" + infoPatternIdx +"']");
        $row.find(".extract-pattern-items").html("");

        self.renderRowItems(infoPattern, infoPatternIdx);
    });

    $(".extract-info-btn").click(function(e) {
    	if(self.resultParams.indexName == "news_quotation"){
        	//인용문 검색 상태인지 확인
            alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
            $("#analytics-btn-tab").blur();
            $("#analytics-preview-tab").click();
        }else if(self.resultParams.isNotTmUsable && !self.resultParams.isTmUsable){
        	alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
        	$("#analytics-btn-tab").blur();
        	$("#analytics-preview-tab").click();
        }else{
        
        	var newsIds = self.resultParams.newsIds;
        	if(newsIds != null) {
        		newsIds = self.resultParams.newsIds.join(",");
        	}
        	
        	if (self.$totalExpression.val()) {
        		var formData = {
        				pageInfo: "newsResult",
        				login_chk: 1,
        				LOGIN_SN: authManager.account.userSn,
        				LOGIN_NAME: authManager.account.userName,
        				indexName: "news",
        				keyword: self.resultParams.searchKey,
        				searchScope: self.resultParams.searchScopeType || 1,
        				searchFtr: self.resultParams.searchFilterType || 1,
        				startDate: self.resultParams.startDate,
        				endDate:  self.resultParams.endDate,
        				sortMethod: self.resultParams.searchSortType || "date",
        				contentLength: 100,
        				highlighting: true,
        				sessionUUID: "test",
        				startNo: 1,
        				resultNumber: 10,
        				resultState: "detailSearch",
        				keywordYn: "Y",
        				totalCount: parseInt($("#total-news-cnt").text().replace(/,/g, "")),
        				searchFromUseYN: "N",
        				sectionDiv: 1000,
        				col: 'xxx',
        				SYNTATIC_PATTERN: self.$totalExpression.val(),
        				serviceName: "systaticPattern",
        				newsIds: newsIds,
        				exceptNewsIds: self.resultParams.exceptNewsIds,
        				isTmUsable: self.resultParams.isTmUsable,
        				isNotTmUsable: self.resultParams.isNotTmUsable,
        				providerCode: self.resultParams.providerCodes.join(","),
        				categoryCode: self.resultParams.categoryCodes.join(","),
        				incidentCode: self.resultParams.incidentCodes.join(","),
        				dateCode: $(".filter-date:checked").map(function() {return this.value;}).get().join(','),
        		};
        		
        		self.$loader.show();
        		
        		$.ajax({
        			url: _contextPath + "/searchSyntaticPatternExtract.do",
        			dataType: "json",
        			method: "POST",
        			data: formData,
        			contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        			success: function(data){
        				if (data && data.result && data.result.COLUMN) {
        					self.extractResultHeader = data.result.COLUMN;
        					self.extractResult = data.result.list;
        					
        					self.renderExtractResult();
        					
        				} else if (data.status == "ok" && data.result.list == undefined) {
        					alert("응답 대기시간을 초과했습니다.\n검색기간을 조정하여 분석 대상 기사를 1,000건 이하로 줄여 시도해주십시오.");
        				} else {
        					alert("정보 추출에 실패하였습니다.");
        				}
        				self.$loader.hide();
        			}
        		});
        	}else{
        		alert("조건(패턴) 입력이 필요합니다.");
        		$("#pattern-extract-expression").focus();
        	}
        	
        }
    });

    $(".my-pattern-modal-btn").click(function(e) {
        // myPatternsTemplate
        $.getJSON(_contextPath + "/api/private/patterns/index.do", function(data) {
            var myPatternsHtml = self.myPatternsTemplate({patterns: data});
            $("#my-pattern-list-wrap > tbody").html(myPatternsHtml);

            $("#my-pattern-modal").modal();
        });
    });

    $(".save-pattern-modal-btn").click(function(e) {
        var expression = $("#pattern-extract-expression").val();

        if (!expression) {
            alert("입력된 패턴식이 없습니다.");
        } else if (authManager.checkAuth()) {
            $("#pattern-pattern").val(expression);
            $("#save-pattern-modal").modal();
        }
    });

    $(document).on("click", ".apply-pattern-btn", function(e) {
        var pattern = $(this).data("pattern");
        $("#pattern-extract-expression").val(pattern);

        $("#my-pattern-modal").modal('hide');
    });

    $(".save-pattern-btn").click(function(e) {
        var title = $("#pattern-title").val();

        if (!title) {
            alert("제목을 입력해 주시기 바랍니다.");
        } else {
            var data = {
                title: title,
                pattern: $("#pattern-pattern").val()
            };

            $.ajax({
                url: _contextPath + "/api/private/patterns/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: function(d) {
                    alert("정상적으로 처리되었습니다.");
                    $("#save-pattern-modal").modal('hide');
                }, error: function(xhr, status, error) {
                    alert("검색식 저장 중 문제가 발생하였습니다. 문제가 지속되면 운영팀에 문의하시기 바랍니다.");
                }
            })
        }
    });

    $(document).on("click", ".download-extract-result", function(e) {
        var fileNamePrefix = "정보추출결과_" + moment().format("YYYYMMDD_HHMM");
        var fileName = fileNamePrefix + ".xlsx";

        var infoData = [self.extractResultHeader];
        _.forEach(self.extractResult, function(result) {
            infoData.push(result);
        });

        var wb = XLSX.utils.book_new();
        var infoSheet = XLSX.utils.aoa_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, infoSheet, "정보추출결과");

        XLSX.writeFile(wb, fileName);

        ga('send', 'event', 'NewsSearch', 'download', 'InfoExtractor_Result');
        
        $.ajax({
        	url: "/api/news/downloadLogging.do",
        	method: "POST",
        	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        	data: { categoryCode:"syntaticPattern"},
        	dataType: "json",
        	success: function(data) {
        		console.log(data);
        	}
        });
    });
}

InfoExtractor.PATTERNS = [
    {
        label: "직접입력",
        expression: "",
        desc: "",
        ex: "",
        isDirectInput: true
    }, {
        label: "인명",
        expression: "'N':PS",
        desc: "인명 개체 추출",
        ex: "(예제) 홍길동, 김재단, 박언론..."
    }, {
        label: "지역명",
        expression: "'N':LC",
        desc: "지역명 개체 추출",
        ex: "(예제) 서울, 강남, 미국..."
    }, {
        label: "기관명",
        expression: "'N':OG",desc: "기관명 개체 추출",
        ex: "(예제) 정부, 통일부, 건국대..."
    },{
        label: "한자",
        expression: "'CHI'",
        desc: "한자로 된 단어 추출",
        ex: "(예제) 韓國, 日, 月..."
    }, {
        label: "영문 대문자",
        expression: "'ENG'",
        desc: "대문자로만 구성된 영어 단어 추출",
        ex: "(예제) OECD, NYT..."
    }, {
        label: "영문 소문자",
        expression: "'eng'",
        desc: "소문자로만 구성된 영어 단어 추출",
        ex: "(예제) borrescope, korea..."
    }, {
        label: "영문 대소문자",
        expression: "'Eng'",
        desc: "대문자로 시작하고, 소문자로 구성된 영어단어",
        ex: "(예제) Robotic, Misson..."
    }, {
        label: "명사",
        expression: "'N'",
        desc: "명사추출",
        ex: "(예제) 현대차, 생산직..."
    }, {
        label: "조사",
        expression: "'J'",
        desc: "조사추출",
        ex: "(예제)은, 는, 이..."
    }, {
        label: "동사",
        expression: "'V'",
        desc: "동사추출",
        ex: "(예제) 일으킨, 밝혔..."
    }, {
        label: "형용사",
        expression: "'ADJ'",
        desc: "형용사추출",
        ex: "(예제) 없, 많, 괜찮..."
    }, {
        label: "부사",
        expression: "'ADV'",
        desc: "부사추출",
        ex: "(예제) 또, 이, 한..."
    }, {
        label: "어미",
        expression: "'E'",
        desc: "어미추출",
        ex: "(예제) 다는, 면, 겠지..."
    }, {
        label: "숫자+명사",
        expression: "'NUMNOUN'",
        desc: "숫자와 명사로 이뤄진 단어 추출",
        ex: "(예제) 19일, 12개, 20명..."
    }, {
        label: "숫자",
        expression: "'NUM'",
        desc: "숫자추출",
        ex: "(예제) 19, 12..."
    }, {
        label: "한글숫자",
        expression: "'KORNUM'",
        desc: "숫자, 한글 또는 숫자와 한글로 이뤄진 단어 추출",
        ex: "(예제) 11만, 일천, 오백..."
    }, {
        label: "날짜",
        expression: "'DATE'",
        desc: "날짜추출",
        ex: "(예제) 2015년, 11월, 9일..."
    }, {
        label: "직접입력(포함)",
        expression: "+",
        desc: "사용자가 입력한 단어가 항상 붙어 있는 단어 추출",
        ex: "(예시) +승, +단계…",
        isDirectInput: true
    }
];