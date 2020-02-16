var AnalysisRelationshipsColorMap = {
    "PERSON": "#8C5226",
    "LOCATION": "#14B777",
    "ORGNIZATION": "#3292E1",
    "KEYWORD": "#F0AA21"
};

var AnalysisRelationships = function(newsResult, chart) {
    this.newsResult = newsResult;
    this.resultParams = this.newsResult.getNetworkParams();

    this.nodeDelimiter = "--";

    this.chart = chart;
    this.viewMode = "network";
    this.$loader = $(".viz-network > .analysis-viz-loader");
    this.zoomValue = 0.8;
    this.minRelatedNewsCount = 30;
    this.relatedRate = 100;

    this.originNodes = [];
    this.originLinks = [];

    this.typeLength = $(".btn-node-type").length;
    this.setSelectedTypes();

    this.graphType = "normal";
    this.nodes = [];
    this.links = [];
    this.detailCategories = ["PERSON", "ORGNIZATION", "LOCATION"];

    this.$keyword = $("#analysis-keyword");

    this.relativeNewsTemplate = Handlebars.getTemplate("analysis/news-list");
    this.$relativeNewsWrap = $("#relative-news-wrap");

    this.zoomSlider = $("#zoom-rate").slider({
        value: 80,
        formatter: function(value) {
            chart.zoom(value / 100, false);
            $("#analysis-zoom-rate").text(value);
        }
    });

    this.nodeDetailTemplate = Handlebars.getTemplate("analysis/node-detail");
    this.$nodeDetailWrap = $("#node-detail-wrap");

    this.$loader = $(".viz-network > .analysis-viz-loader");

    this.getNetworkData();
    this.initEvent();
}

AnalysisRelationships.prototype.updateResultData = function() {
    var self = this;
    var resultParams = self.newsResult.getNetworkParams();

    if (JSON.stringify(this.resultParams) !== JSON.stringify(resultParams)) {
        this.resultParams = resultParams;
        this.getNetworkData();
    }
}

AnalysisRelationships.prototype.calcRelationship = function(a, min) {
    var fn = function(n, src, got, all) {
        if (n == 0) {
            if (got.length > 0) {
                all[all.length] = got;
            }
            return;
        }
        for (var j = 0; j < src.length; j++) {
            fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
        }
        return;
    }
    var all = [];

    fn(2, a, [], all);

    all.push(a);

    return all;
}

AnalysisRelationships.prototype.getCombination = function(array) {
    var results = [];

    // Since you only want pairs, there's no reason
    // to iterate over the last element directly
    for (var i = 0; i < array.length - 1; i++) {
        // This is where you'll capture that last value
        for (var j = i + 1; j < array.length; j++) {
            results.push([array[i], array[j]]);
            //results.push(array[i] + ' ' + array[j]);
        }
    }

    return results;
}

AnalysisRelationships.prototype.replaceChartData = function() {
    var self = this;

    self.$loader.show();

    var slicedEntities = _.filter(self.entityNodes, function(node) {
        return node.weight >= self.minRelatedNewsCount;
    });

    if (self.selectedTypes.length < self.typeLength) {
        slicedEntities = _.filter(slicedEntities, function(entity) {
            var type = entity.category.toLowerCase();
            return type == "root" || self.selectedTypes.indexOf(type) >= 0;
        });
    }

    var links = [];
    var tempLinks = [];

    if (self.graphType == "normal") {
        _.forEach(slicedEntities, function (entityNode) {
            links.push({
                from: "ROOT",
                to: entityNode.id
            });

            var tempLink = _.filter(self.originLinks, function(l) {
                return l.to === entityNode.id;
            });

            if (tempLink) {
                tempLinks = tempLinks.concat(tempLink);
            }
        });

        var groupedLinks = _.groupBy(tempLinks, 'from');

        var linkCntMap = {};
        _.forEach(groupedLinks, function(gLink) {
            if (gLink.length > 1) {
                var toLinks = [];
                _.forEach(gLink, function(linkItem) {
                    toLinks.push(linkItem.to);
                });

                _.forEach(self.getCombination(toLinks), function(combinationLink) {
                    var linkCntKey = combinationLink[0] + self.nodeDelimiter + combinationLink[1];
                    if (!linkCntMap[linkCntKey]) {
                        linkCntMap[linkCntKey] = 0;
                    }
                    linkCntMap[linkCntKey]++;
                });
            }
        });

        _.forEach(linkCntMap, function(cnt, key) {
            if (cnt >= self.minRelatedNewsCount) {
                var link = key.split(self.nodeDelimiter);
                links.push({
                    from: link[0],
                    to: link[1]
                });
            }
        });
    } else if (self.graphType == "provider_name") {
        var entityIds = _.map(slicedEntities, "id");
        var relatedLinks = _.filter(self.originLinks, function(oLink) {
            return entityIds.indexOf(oLink.to) > -1;
        });

        var relatedNewsIds = _.map(relatedLinks, "from");
        var relatedNews = _.filter(self.newsList, function(newsItem) {
            return relatedNewsIds.indexOf(newsItem.news_id) > -1;
        });

        // Uniq 한 매체를 추출하고 이에 대한 정보를 Node로 추가
        var providerNames = _.uniq(_.map(relatedNews, "provider_name"));
        _.forEach(providerNames, function(providerName, idx) {
            slicedEntities.push({
                id: providerName,
                title: providerName,
                weight: 10,
                category: "provider"
            });

            links.push({
                from: "ROOT",
                to: providerName
            });
        });

        _.forEach(relatedLinks, function(relLink) {
            var news = _.find(self.newsList, function(newsItem) {
                return relLink.from == newsItem.news_id;
            });

            if (news) {
                links.push({
                    from: news.provider_name,
                    to: relLink.to
                });
            }
        });
    }

    links = _.uniqWith(links, _.isEqual);

    self.renderedData = {
        nodes: slicedEntities, links: links
    };

    self.chart.reloadData();
    self.chart.replaceData(self.renderedData);

    var countedNodes = _.countBy(slicedEntities, "category");
    $("#relative-person-cnt").text(countedNodes["PERSON"] || 0);
    $("#relative-location-cnt").text(countedNodes["LOCATION"] || 0);
    $("#relative-org-cnt").text(countedNodes["ORGNIZATION"] || 0);
    $("#relative-keyword-cnt").text(countedNodes["KEYWORD"] || 0);

    self.initChartSetting();
}

AnalysisRelationships.prototype.initChartSetting = function() {
    var self = this;

    setTimeout(function() {
        var setting = self.getChartArea();
        setting.events = {
            onClick: function(event) {
                if (event.clickNode) {
                    var node = event.clickNode;
                    self.chart.clearFocus();
                    self.chart.addFocusNode(node.id);

                    if (node.data && self.detailCategories.indexOf(node.data.category) > -1) {
                        self.getDetailInfo(node.data);
                    }

                    var relatedLinks = _.filter(self.originLinks, function(oLink) {
                        return node.id == oLink.to;
                    });
                    var relatedNewsIds = _.map(relatedLinks, "from");

                    $(".analysis-network-news").removeClass("related");
                    var types = ["PERSON", "LOCATION", "ORGNIZATION", "KEYWORD"];
                    $(".analysis-network-news .related-icon").removeClass(types.join(" "));

                    var $container = $("#relative-news-wrap");
                    var $scrollTo = null;
                    var minTop = 99999;
                    _.forEach(relatedNewsIds, function(newsId) {
                        var $tmp = $(".analysis-network-news[data-id='" + newsId + "']");
                        if ($tmp.length) {
                            if ($tmp.offset().top < minTop) {
                                minTop = $tmp.offset().top;
                                $scrollTo = $tmp;
                            }

                            $(".analysis-network-news[data-id='" + newsId + "']").addClass("related");
                            $(".analysis-network-news[data-id='" + newsId + "'] .related-icon").addClass(node.data.category);
                        }
                    });

                    if ($scrollTo) {
                        $container.animate({scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop(), scrollLeft: 0},300);
                    }
                }
            },
            onRightClick: function(event) {
                if (event.clickNode){
                    if (confirm("선택한 노드를 삭제하시겠습니까?")) {
                        if (event.clickNode.id === "ROOT") {
                            if (confirm("선택하신 노드는 ROOT(중앙)노드 입니다. 정말 삭제하시겠습니까?")) {
                                event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                            }
                        } else {
                            event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                        }
                    }

                }
            }
        }

        self.chart.updateSettings(setting);
        self.chart.resetLayout();
        self.zoomSlider.slider('setValue', self.chart.zoom() * 100);
        self.$loader.hide();
    }, 700);
}

AnalysisRelationships.prototype.getChartArea = function() {
    var self = this;
    var networkWidth = $(".viz-network-graph-wrap").width();
    var sidebarWidth = $(".viz-network-graph-wrap .sidebar").width();
    var doubleSidebarWidth = 398; // $(".viz-network-graph-wrap .sidebar.double").width();

    if (sidebarWidth > 0) {
        switch (self.viewMode) {
            case "kb-network":
                networkWidth = networkWidth - sidebarWidth;
                break;
            case "network-news":
                networkWidth = networkWidth - doubleSidebarWidth;
                break;
            case "kb-network-news":
                networkWidth = networkWidth - (sidebarWidth * 2);
                break;
        }
    }

    var areaSetting = {
        area: {
            width: networkWidth
        }
    };

    if (isMobileSize()) {
        areaSetting.area.height = 420;
    }

    return areaSetting;
}

AnalysisRelationships.prototype.removeNode = function(event, self) {
    if (event.clickNode) {
        if (confirm("선택한 노드를 삭제하시겠습니까?")) {
            if (event.clickNode.id == "ROOT") {
                if (confirm("그래프의 중심이 되는 노드를 선택하셨습니다. 정말 삭제하시겠습니까?")) {
                    event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                }
            } else {
                event.chart.removeData({nodes:[{id:event.clickNode.id}]});
            }
        }
    }
}
 
AnalysisRelationships.prototype.getNetworkData = function() {
    var self = this;

    if (self.resultParams) {
        self.$loader.show();
        self.resultParams.maxNewsCount = 1000;
        self.resultParams.sectionDiv = 1000;
        self.resultParams.endDate = moment(self.resultParams.endDate).add(1, 'days').format("YYYY-MM-DD");
        self.resultParams.resultNo = 100;
        self.resultParams.isTmUsable = $("#filter-tm-use").is(":checked");
        self.resultParams.isNotTmUsable = $("#filter-not-tm-use").is(":checked");
        
        var searchFilterType = $("#search-filter-type option:selected").val();
        var searchScopeType = $("#search-scope-type option:selected").val();
        
        if(searchFilterType != "" && searchFilterType != null){
        	self.resultParams.searchFtr = $("#search-filter-type option:selected").val();
        }
        
        if(searchScopeType != "" && searchScopeType != null){
        	self.resultParams.searchScope = $("#search-scope-type option:selected").val();
        }
        //
        if (self.resultParams.providerCode
            || self.resultParams.categoryCode
            || self.resultParams.incidentCode
            || self.resultParams.dateCode) {

            var filterProviderCodes = [];
            var filterCategoryCodes = [];
            var filterIncidentCodes = [];

            var splitProviderCodes = self.resultParams.providerCode.split(",");
            for (var i = 0; i < splitProviderCodes.length; i++) {
                filterProviderCodes.push("reprov_" + splitProviderCodes[i].trim());
            }

            var splitCategoryCodes = self.resultParams.categoryCode.split(",");
            for (var i = 0; i < splitCategoryCodes.length; i++) {
                filterCategoryCodes.push("recate_" + splitCategoryCodes[i].trim());
            }

            var splitIncidentCodes = self.resultParams.incidentCode.split(",");
            for (var i = 0; i < splitIncidentCodes.length; i++) {
                filterIncidentCodes.push(splitIncidentCodes[i].trim());
            }

            var paramData = {
                filterProviderCode: filterProviderCodes.join(","),
                filterCategoryCode:  filterCategoryCodes.join(","),
                filterIncidentCategoryCode:  filterIncidentCodes.join(","),
                filterDateCode: self.resultParams.dateCode,
                filterAnalysisCode: ""
            };

            self.resultParams.keywordFilterJson = JSON.stringify(paramData);
        } else {
            self.resultParams.keywordFilterJson = null;
        }
        
        if(self.resultParams.indexName == "news_quotation"){
        	//인용문 검색 상태인지 확인
        	$("#analytics-network-tab").blur();
        	self.$loader.hide();
            alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
            $("#analytics-preview-tab").click();
        }else if(self.resultParams.isNotTmUsable && !self.resultParams.isTmUsable){
        	//분석제외 필터 선택 상태인지 확인
        	//차트 데이터 제거 , 차트 필터 숨김
			$(".analysis-network__filter-box").hide();
			self.chart.replaceData([]);
			self.$relativeNewsWrap.html("");
			self.$nodeDetailWrap.html("");
			
			var cloudCategories = [
			                       "keyword",
			                       "person",
			                       "orgnization",
			                       "location"
			                   ];
			
			var width = $("#keyword-cloud").width();

           _.forEach(cloudCategories, function(category) {
               $("#" + category + "-cloud").html("");
           });
        	                   
           self.$loader.hide();
           alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
           $("#analytics-network-tab").blur();
           $("#analytics-preview-tab").click();
        }else{
        	$.ajax({
        		url: _contextPath + "/news/getNetworkDataAnalysis.do",
        		method: "POST",
        		dataType: "JSON",
        		data: $.param(self.resultParams),
        		success: function(result) {
        			var maxWeight = 0;
        			$(".analysis-network__filter-box").show();
        			if (result && result.nodes && result.links) {
        				_.forEach(result.nodes, function(node) {
        					maxWeight = Math.max(maxWeight, node.weight);
        					
        					if (node.id == "ROOT") {
        						self.rootNode = node;
        						node.title = self.resultParams.keyword;
        						node.label_ne = self.resultParams.keyword;
        						node.weight = 100;
        					}
        					
        					delete node["style"];
        				});
        				
        				self.minRelatedNewsCount = parseInt(maxWeight * 0.1) + 1;
        				
        				self.originLinks = result.links;
        				self.originNodes = result.nodes;
        				
        				// News를 제외한 node 정의
        				self.entityNodes = _.orderBy(
        						_.filter(self.originNodes, function(n) {
        							return n.category !== "NEWS";
        						}), "weight", "desc"
        				);
        				
        				var newsIdList = result.newsIds;
        				if (result.newsCluster) {
        					newsIdList.concat(result.newsCluster.split(","));
        				}
        				
        				self.newsIds = newsIdList;
        				self.newsList = result.newsList;
        				self.renderRelativeNews();
        				self.replaceChartData();
        				
        				$("#analysis-news-cnt").val(self.minRelatedNewsCount);
        				self.relativeSlider = $("#relative-rate").slider({
        					max: maxWeight,
        					formatter: function(value) {
        						$("#analysis-news-cnt").text(value);
        					}
        				});
        				
        				self.relativeSlider.slider("setValue", self.minRelatedNewsCount);
        				
        				self.relativeSlider.on("slideStop", function(currentSlider) {
        					self.relatedRate = currentSlider.value;
        					self.minRelatedNewsCount = currentSlider.value;
        					self.replaceChartData();
        				});
        				
        				var initKBNode;
        				if (result.kbSearchPersonJson) {
        					var ps_node = result.kbSearchPersonJson;
        					initKBNode = {
        							larm_knowledgebase_sn: ps_node.larm_knowledgebase_sn,
        							category: ps_node.category,
        							kb_use_yn: ps_node.kb_use_yn,
        							label_ne: ps_node.label_ne,
        							kb_service_id: null
        					};
        				} else {
        					initKBNode = _.find(self.entityNodes, function(node) {
        						return self.resultParams.keyword.indexOf(node.label_ne) >= 0 && node.larm_knowledgebase_sn;
        					});
        				}
        				
        				if (!initKBNode) {
        					initKBNode = _.find(self.entityNodes, function(node) {
        						return self.detailCategories.indexOf(node.category) > -1;
        					});
        				}
        				
        				if (initKBNode) {
        					self.getDetailInfo(initKBNode);
        				}
        				
        				if (!isMobileSize()) {
        					self.renderClouds();
        				}
        				
        				if (result.nodes.length == 0 && result.links.length == 0) {
        					self.getDetailInfo(null);
        					alert("조회된 데이터가 없습니다.");
        					return false;
        				}
        			}
        		}
        	});
        }
    }
}

AnalysisRelationships.prototype.setSelectedTypes = function() {
    var self = this;

    self.selectedTypes = $(".btn-node-type.active").map(function(){
        return $(this).data("type");
    }).get();
}

AnalysisRelationships.prototype.getDetailInfo = function(node) {
    var self = this;

    if (node && node.category !== "NEWS") {
        var data = {
            larm_knowledgebase_sn: node.larm_knowledgebase_sn,
            category: node.category,
            kb_use_yn: node.kb_use_yn,
            label_ne: node.label_ne,
            kb_service_id: node.kb_service_id
        };

        $.ajax({
            url: _contextPath + "/news/nodeDetailData.do",
            method: "POST",
            dataType: "JSON",
            data: $.param(data),
            success: function(result) {
                var data = {};

                if (result && result.baseData) {
                    if (result.baseData.BASE_IMAGE_URL !== "none") {
                        data.nodeImg = result.baseData.BASE_IMAGE_URL;
                    }

                    data.title = result.baseData.BASE_NAME || node.label_ne;
                }

                if (result && result.baseItem) {
                    data.infoItems = [];

                    _.forEach(result.baseItem, function(baseItem) {
                        data.infoItems.push({
                            label: baseItem.ITEM_NAME,
                            values: baseItem.ITEM_VALUE.split("/")
                        });
                    });
                }

                var nodeDetailHtml = self.nodeDetailTemplate(data);
                self.$nodeDetailWrap.html(nodeDetailHtml);

                if (data.nodeImg) {
                    var img = new Image();
                    img.onload = function(){
                        var ratioWidth = parseInt(this.width * 80 / this.height);
                        $("#analysis-network-detail-image-wrap").css("width", ratioWidth + "px");
                    };

                    img.src = data.nodeImg;
                }
            }
        });
    } else {
        self.$nodeDetailWrap.html("");
    }
}

AnalysisRelationships.prototype.getNewsList = function() {
    var self = this;
    var newsParam = self.newsResult.getResultParams();
    var params = {
        keyword: newsParam.searchKey,
        startDate: newsParam.startDate,
        endDate: newsParam.endDate,
        newsIds: self.newsIds.join(","),
        resultNo: self.newsIds.length
    };

    $.ajax({
        url: _contextPath + "/api/news/searchWithDetails.do",
        dataType: "json",
        method: "POST",
        data: $.param(params),
        success: function (d) {
            self.newsList = d;
            self.renderRelativeNews();
        }, error: function(err) {
            console.log(err);
        }
    });
}

AnalysisRelationships.prototype.renderRelativeNews = function() {
    var self = this;

    var relativeNewsHtml = self.relativeNewsTemplate({ newsList: self.newsList });
    self.$relativeNewsWrap.html(relativeNewsHtml);
}

AnalysisRelationships.prototype.renderClouds = function () {
    var self = this;

    var cloudCategories = [
        "keyword",
        "person",
        "orgnization",
        "location"
    ];

    var width = $("#keyword-cloud").width();
    var height = 360;
    var weight = 2;

    _.forEach(cloudCategories, function(category) {
        $("#" + category + "-cloud").html("");
        self.renderCloud(category, width, height, weight);
    });
}

AnalysisRelationships.prototype.renderCloud = function(category, width, height, weight) {
	var self = this;
	
    var maxFontSize = 30; // 최대값 30으로 수정
    var minFontSize = 14; // 최소값 14으로 수정

    var wordData = _.filter(self.originNodes, function(node) {
        node.text = node.label_ne;
        node.category = node.category;
        return node.category.toLowerCase() === category;
    });
    
    //텍스트 오름차 -> 가중치 내림차 순으로 정렬 후 상위 40개 추출
    wordData = wordData.sort(function(a,b){return(a.text<b.text) ? -1 : (a.text>b.text) ? 1 : 0;});
	wordData = wordData.sort(function(a,b){return(a.weight>b.weight) ? -1 : (a.weight<b.weight) ? 1 : 0;});
	wordData = wordData.slice(0, 40);
    
    var minWeight = d3.min(wordData, function(d) { return d.weight; });
    var maxWeight = d3.max(wordData, function(d) { return d.weight; });
    var weightRange = maxWeight - minWeight;
    weightRange = weightRange > 0 ? weightRange : 1;
    var resizeRatio = (maxFontSize - minFontSize) / weightRange;

    _.forEach(wordData, function (d) {
        d.size = minFontSize + (resizeRatio * (d.weight - minWeight));
    })

    var noMissing = true;
    var whileLimit = 5;
    var whileCnt = 0;
    d3.layout.cloud().size([width, height]).words(wordData).rotate(0)
        .font("Noto Sans KR")
        .fontSize(function(d) {
            return d.size;
    }).on("end", function(words) {
        if (wordData.length != words.length) {
            noMissing = false; // wordData와 words의 length가 같지 않으면 missing Data가 있는 걸로 간주
            
            while(!noMissing) {  // missing Data가 없을 때까지 반복
            	d3.layout.cloud().size([width, height]).words(wordData).rotate(0)
                    .font("Noto Sans KR")
                    .fontSize(function(d) {
                        return d.size;
                }).on("end", function(words) {
                    if (wordData.length != words.length) {
                        _.forEach(wordData, function (d) {
                            if (d.size > minFontSize) {d.size = d.size -1;} // data의 폰트 사이즈가 minFontSize 이상일 때 폰트 사이즈 1씩 감소
                        });
                    } else {
                        noMissing = true;
                    }
                }).start();
                if (noMissing) { break; } // d3.layout.cloud function에서는 break 사용불가능하여 밖에서 조건문 수행
                
                whileCnt++;
                if(whileCnt == whileLimit){
                	noMissing = true;
                }
            }

        }
    }).start();

    if (noMissing) { // missing Data가 없을 때만 워드클라우드 그려줌
        d3.layout.cloud().size([width, height]).words(wordData).rotate(0)
            .font("Noto Sans KR")
            .fontSize(function(d) {
                return d.size;
        }).on("end", function(words) {
            self.drawCloud(words, category, wordData);
        }).start();

    }
}

AnalysisRelationships.prototype.drawCloud = function(words, category, wordData) {
    var width = $("#keyword-cloud").width(), height = 360;
    // var fill = d3.scale.category20();

    var categoryId = "#" + category + "-cloud";

    d3.select(categoryId).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
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
            var category = wordData[i].category;
            return AnalysisRelationshipsColorMap[category];
        })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
}


AnalysisRelationships.prototype.initEvent = function() {
    var self = this;

    $(".analysis-btn").click(function(e) {
        self.keyword = self.$keyword.val();

        self.getNetworkData();
    });

    $("input[name='analysis-node-type']").change(function(e) {
        self.selectedTypes = $("input[name='analysis-node-type']:checked").map(function(){
            return $(this).val();
        }).get();

        self.replaceChartData();
    });

    $(".btn-node-type").click(function(e) {
        var $btn = $(this);
        if ($btn.hasClass("active")) {
            $btn.removeClass("active");
        } else {
            $btn.addClass("active");
        }

        self.setSelectedTypes();

        self.replaceChartData();
    });

    $(".network-relayout-btn").click(function() {
        self.chart.resetLayout();
        self.zoomSlider.slider('setValue', self.chart.zoom() * 100);
    });

    $(".network-fullscreen-btn").click(function() {
        var $btn = $(this);
        var isFullscreen = false;

        if ($btn.hasClass("active")) {
            $(".analysis-network__diagram").removeClass("fullscreen");
            $btn.removeClass("active");
        } else {
            isFullscreen = true;
            $(".analysis-network__diagram").addClass("fullscreen");
            $btn.addClass("active");
        }

        self.chart.fullscreen(isFullscreen);
    });

    $(".network-lock-btn").click(function() {
        var lockMode = "dynamic";
        var $btn = $(this);

        if ($btn.hasClass("active")) {
            $btn.removeClass("active");
        } else {
            lockMode = "static";
            $btn.addClass("active");
        }

        self.chart.updateSettings({
            layout: {
                mode: lockMode
            }
        });
    });

    $(".network-download").click(function(e) {
        e.preventDefault();
        var fileNamePrefix = "시각화분석결과_" + moment().format("YYYYMMDD_HHMM");
        var dataType = $(this).data("type");
        var labelType = "";
        if (dataType == "xlsx") {
            labelType = "NewsData";
            var fileName = fileNamePrefix + ".xlsx";
            var nodeSheetName = "node_data";
            var nodeData = [
                ["ID", "Name", "Category", "Weight"]
            ];
            _.forEach(self.renderedData.nodes, function(node) {
                nodeData.push([
                    node.id, node.label_ne.replace(/&apos;/gi, "'"), node.category, node.weight
                ]);
            });

            var linkSheetName = "link_data";
            var linkData = [
                ["ID", "From", "To"]
            ];
            _.forEach(self.renderedData.links, function(link) {
                linkData.push([
                    link.id, link.from, link.to
                ]);
            });

            var wb = XLSX.utils.book_new();
            var nodeSheet = XLSX.utils.aoa_to_sheet(nodeData);
            var linkSheet = XLSX.utils.aoa_to_sheet(linkData);

            XLSX.utils.book_append_sheet(wb, nodeSheet, nodeSheetName);
            XLSX.utils.book_append_sheet(wb, linkSheet, linkSheetName);

            XLSX.writeFile(wb, fileName);
        } else if (dataType == "xlsx-news") {
            labelType = "GraphData";
            var fileName = "시각화분석결과_뉴스데이터_" + moment().format("YYYYMMDD_HHMM") + ".xlsx";
            var sheetName = "news_data";
            var sheetData = [
                [
                    "뉴스 식별자", "일자", "언론사", "기고자", "제목",
                    "통합 분류1", "통합 분류2", "통합 분류3",
                    "사건/사고 분류1", "사건/사고 분류2", "사건/사고 분류3",
                    "인물", "위치", "기관", "키워드", "본문"
                ]
            ];

            _.forEach(self.newsList, function(item) {
                var categoryNames = ["", "", ""];
                var incidentNames = ["", "", ""];

                var categoryName = item.category.replace(/[{()}]/g, '');
                categoryName = categoryName.replace(/[\[\]']+/g, '');

                if (categoryName.split(",").length) {
                    _.forEach(categoryName.split(","), function(name, idx) {
                        categoryNames[idx] = name.trim();
                    });
                }

                if (item.category_incident.split(",").length) {
                    _.forEach(item.category_incident.split(","), function(incidentName, idx) {
                        incidentNames[idx] = incidentName.trim();
                    });
                }

                var persons = [];
                _.forEach(item.inPerson, function(item) {
                    persons.push(item.label);
                });

                var locations = [];
                _.forEach(item.inLocation, function(item) {
                    locations.push(item.label);
                });

                var orgs = [];
                _.forEach(item.inOrganization, function(item) {
                    orgs.push(item.label);
                });

                var keywords = [];
                _.forEach(item.inKeyword, function(item) {
                    keywords.push(item.label);
                });

                sheetData.push([
                    item.news_id,
                    item.date,
                    item.provider_name,
                    item.byline,
                    item.title,
                    categoryNames[0],
                    categoryNames[1],
                    categoryNames[2],
                    incidentNames[0],
                    incidentNames[1],
                    incidentNames[2],
                    persons.join(", "),
                    locations.join(", "),
                    orgs.join(", "),
                    keywords.join(", "),
                    item.content
                ]);
            });

            var wb = XLSX.utils.book_new();
            var sheet = XLSX.utils.aoa_to_sheet(sheetData);

            XLSX.utils.book_append_sheet(wb, sheet, sheetName);
            XLSX.writeFile(wb, fileName);
        } else if (dataType == "png") {
            labelType = "Image(png)";
            var fileName = fileNamePrefix + ".png";
            self.chart.exportAsString("png", function(dataUri, mimeType, extension){
                ZoomCharts.Internal.Base.Export.launchDownload(self.chart, mimeType, fileName, dataUri);
            });
        } else {
            labelType = "Image(jpg)";
            var fileName = fileNamePrefix + ".jpg";
            self.chart.exportAsString("jpg", function(dataUri, mimeType, extension){
                ZoomCharts.Internal.Base.Export.launchDownload(self.chart, mimeType, fileName, dataUri);
            });
        }

        var label = 'Relationships_'.concat(labelType);
        ga('send', 'event', 'NewsSearch', 'download', label);
        
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

    $(".download-chart-img-btn").click(function() {
        self.chart.export($(this).data("type"));
    });

    $(".analysis-network-view-mode-btn").click(function(e) {
        var $btn = $(this);
        $btn.toggleClass("active");

        var visibleKB = $(".analysis-network-view-mode-btn[data-view='kb-detail']").hasClass("active");
        var visibleNews = $(".analysis-network-view-mode-btn[data-view='related-news']").hasClass("active");

        $(".network-news-sidebar").removeClass("double");
        if (visibleKB && visibleNews) {
            self.viewMode = "kb-network-news";
            $(".network-kbase-sidebar").removeClass("active");
            $(".network-news-sidebar").removeClass("active");
        } else if (visibleKB) {
            self.viewMode = "kb-network";

            $(".network-kbase-sidebar").removeClass("active");
            $(".network-news-sidebar").addClass("active");
        } else if (visibleNews) {
            self.viewMode = "network-news";

            $(".network-kbase-sidebar").addClass("active");
            $(".network-news-sidebar").removeClass("active").addClass("double");
        } else {
            self.viewMode = "network";

            $(".network-kbase-sidebar").addClass("active");
            $(".network-news-sidebar").addClass("active");
        }

        self.chart.updateSettings(self.getChartArea());
        self.chart.resetLayout();
    });

    $(".group-type-btn").click(function(e) {
        var $btn = $(this);
        if (!$btn.hasClass("active")) {
            $(".group-type-btn").removeClass("active");
            $btn.addClass("active");

            self.graphType = $btn.data("type");
            self.replaceChartData();
        }
    });

    $(document).on("click", ".analysis-network-news-header", function(e) {
        e.preventDefault();
        var newsId = $(this).data("id");
        $(".analysis-network-news[data-id='" + newsId + "']").toggleClass("active");
    });
}