sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../js/Common",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/ui/core/routing/HashChanger",
    'sap/m/Token',
    'sap/m/ColumnListItem',
    'sap/m/Label'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller,JSONModel,MessageBox,Common,Filter,FilterOperator,HashChanger,Token,ColumnListItem,Label) {
        "use strict";

        var me;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "YYYY-MM-dd" });
        var sapDateFormat2 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyyMMdd" });

        return Controller.extend("zuicostcnfg.controller.Main", {

            onInit: function () {
                me = this;
                this._aColumns = {};
                this._aDataBeforeChange = [];
                this._validationErrors = [];
                this._bHdrChanged = false;
                this._bDtlChanged = false;
                this._dataMode = "READ";
                this._aColFilters = [];
                this._aColSorters = [];
                this._aMultiFiltersBeforeChange = [];
                this._aFilterableColumns = {};
                this._sActiveTable = "headerTab";
                this._oModel = this.getOwnerComponent().getModel();
                Common.openLoadingDialog(this);

                this.getView().setModel(new JSONModel({
                    activeComp: "",
                    activeCompDisplay: ""
                }), "ui");

                this._counts = {
                    header: 0,
                    detail: 0
                }

                this.getView().setModel(new JSONModel(this._counts), "counts");

                this.byId("headerTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                }));

                this.byId("detailTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                }));

                var oDDTextParam = [], oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oDDTextParam.push({CODE: "SBU"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_TO_PROC"});
                oDDTextParam.push({CODE: "INFO_NO_SEL_RECORD_TO_PROC"});
                oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                oDDTextParam.push({CODE: "INFO_INPUT_REQD_FIELDS"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                oDDTextParam.push({CODE: "INFO_SEL_RECORD_TO_DELETE"});  
                oDDTextParam.push({CODE: "INFO_DATA_DELETED"});  
                oDDTextParam.push({CODE: "CONF_DELETE_RECORDS"});  
                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_SAVE"});
                oDDTextParam.push({CODE: "INFO_DATA_SAVE"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
                oDDTextParam.push({CODE: "INFO_CHECK_INVALID_ENTRIES"});
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "EDIT"});
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "DELETE"});
                oDDTextParam.push({CODE: "REFRESH"});
                oDDTextParam.push({CODE: "COPY"});
                oDDTextParam.push({CODE: "INFO_INPUT_REQD_FIELDS"}); 
                oDDTextParam.push({CODE: "INFO_NO_DATA_MODIFIED"}); 
                oDDTextParam.push({CODE: "INFO_DATA_COPIED"}); 

                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {        
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        me.getView().setModel(new JSONModel(oDDTextResult), "ddtext");
                    },
                    error: function(err) { }
                });

                var oTableEventDelegate = {
                    onkeyup: function (oEvent) {
                        me.onKeyUp(oEvent);
                    },

                    onAfterRendering: function (oEvent) {
                        var oControl = oEvent.srcControl;
                        var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                        if (sTabId.substr(sTabId.length - 3) === "Tab") me._tableRendered = sTabId;
                        else me._tableRendered = "";

                        me.onAfterTableRendering();
                    },

                    onclick: function(oEvent) {
                        me.onTableClick(oEvent);
                    }
                };

                this.byId("headerTab").addEventDelegate(oTableEventDelegate);
                this.byId("detailTab").addEventDelegate(oTableEventDelegate);
                this.getColumnProp();

                this._oModel.read('/HeaderSet', {
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            var vComp = "";
                            oData.results.sort((a,b) => (a.SEQ > b.SEQ ? 1 : -1));

                            oData.results.forEach((item, index) => {  
                                if (item.EFFECTDT !== null)
                                    item.EFFECTDT = dateFormat.format(new Date(item.EFFECTDT));

                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
    
                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
    
                                if (index === 0) {
                                    item.ACTIVE = "X";
                                    vComp = item.COSTCOMPCD;
                                    me.getView().getModel("ui").setProperty("/activeComp", item.COSTCOMPCD);
                                    me.getView().getModel("ui").setProperty("/activeCompDisplay", item.COSTCOMPCD);
                                }
                                else item.ACTIVE = "";
                            });

                            me._oModel.read('/DetailSet', {
                                urlParameters: {
                                    "$filter": "COSTCOMPCD eq '" + vComp + "'"
                                },
                                success: function (oDataDtl) {
                                    if (oDataDtl.results.length > 0) {
                                        oDataDtl.results.forEach((item, index) => {  
                                            if (item.CREATEDDT !== null)
                                                item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                
                                            if (item.UPDATEDDT !== null)
                                                item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                
                                            if (index === 0) item.ACTIVE = "X";
                                            else item.ACTIVE = "";
                                        });
                                    }
            
                                    me.byId("detailTab").getModel().setProperty("/rows", oDataDtl.results);
                                    me.byId("detailTab").bindRows("/rows");
                                    me.getView().getModel("counts").setProperty("/detail", oDataDtl.results.length);
                                    me.setActiveRowHighlight("detailTab");
                                    Common.closeLoadingDialog(me);
                                },
                                error: function (err) {
                                    Common.closeLoadingDialog(me);
                                }
                            })                            
                        }
                        else {
                            me.byId("detailTab").getModel().setProperty("/rows", []);
                            me.byId("detailTab").bindRows("/rows");
                            me.getView().getModel("counts").setProperty("/detail", 0);
                            Common.closeLoadingDialog(me);
                        }

                        me.byId("headerTab").getModel().setProperty("/rows", oData.results);
                        me.byId("headerTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/header", oData.results.length);
                        me.setActiveRowHighlight("headerTab");
                    },
                    error: function (err) { 
                        Common.closeLoadingDialog(me);
                    }
                })

                this._oModel.read('/CompanyVHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COMPANY_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/PlantVHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "PLANT_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/ComponentVHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COMPONENT_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/SalesTermVHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "SALESTERM_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/StatusVHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "STATUS_MODEL");
                    },
                    error: function (err) { }
                })

                this.getAppAction();
            }, 

            getAppAction: async function() {
                if (sap.ushell.Container !== undefined) {
                    const fullHash = new HashChanger().getHash(); 
                    const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                    const shellHash = urlParsing.parseShellHash(fullHash); 
                    console.log(shellHash);
                    console.log(shellHash.action);
                }
            },

            getHeaderData() {
                // var oTable = this.byId('detailTab');
                // var oColumns = oTable.getColumns();

                // for (var i = 0, l = oColumns.length; i < l; i++) {
                //     if (oColumns[i].getFiltered()) {
                //         oColumns[i].filter("");
                //     }

                //     if (oColumns[i].getSorted()) {
                //         oColumns[i].setSorted(false);
                //     }
                // }

                Common.openProcessingDialog(me, "Processing...");
                this._oModel.read('/HeaderSet', {
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            oData.results.sort((a,b) => (a.SEQ > b.SEQ ? 1 : -1));

                            oData.results.forEach((item, index) => {  
                                if (item.EFFECTDT !== null)
                                    item.EFFECTDT = dateFormat.format(new Date(item.EFFECTDT));

                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
    
                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
    
                                if (index === 0) {
                                    item.ACTIVE = "X";
                                    me.getView().getModel("ui").setProperty("/activeComp", item.COSTCOMPCD);
                                    me.getView().getModel("ui").setProperty("/activeCompDisplay", item.COSTCOMPCD);
                                }
                                else item.ACTIVE = "";
                            });
                            
                            me.getDetailData(false);
                        }
                        else {
                            me.byId("detailTab").getModel().setProperty("/rows", []);
                            me.byId("detailTab").bindRows("/rows");
                            me.getView().getModel("counts").setProperty("/detail", 0);
                        }

                        me.byId("headerTab").getModel().setProperty("/rows", oData.results);
                        me.byId("headerTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/header", oData.results.length);
                        me.setActiveRowHighlight("headerTab");

                        if (me._aColFilters.length > 0) { me.setColumnFilters("headerTab"); }
                        if (me._aColSorters.length > 0) { me.setColumnSorters("headerTab"); }
                    },
                    error: function (err) { 
                        Common.closeProcessingDialog(me);
                    }
                })
            },

            getDetailData(arg) {
                if (arg) Common.openProcessingDialog(me, "Processing...");

                var vComp = this.getView().getModel("ui").getData().activeComp;

                this._oModel.read('/DetailSet', {
                    urlParameters: {
                        "$filter": "COSTCOMPCD eq '" + vComp + "'"
                    },
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            oData.results.forEach((item, index) => {  
                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
    
                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
    
                                if (index === 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            });
                        }

                        me.byId("detailTab").getModel().setProperty("/rows", oData.results);
                        me.byId("detailTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/detail", oData.results.length);
                        me.setActiveRowHighlight("detailTab");

                        if (me._aColFilters.length > 0) { me.setColumnFilters("detailTab"); }
                        if (me._aColSorters.length > 0) { me.setColumnSorters("detailTab"); }

                        Common.closeProcessingDialog(me);
                    },
                    error: function (err) {
                        Common.closeProcessingDialog(me);
                    }
                })
            },

            getColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuicostcnfg", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                // var oColumns = [];

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getDynamicColumns("COSTCNFGHDR", "ZERP_CSCONFIG", "headerTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getDynamicColumns("COSTCNFGDTL", "ZERP_CSCONFVAR", "detailTab", oColumns);
                }, 100);
            },
            
            getDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = "VER"; 

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => {
                                            item.ValueHelp = col.ValueHelp;
                                            item.TextFormatMode = col.TextFormatMode;
                                        })
                                })
                            }
                            
                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setTableColumns(arg1, arg2) {
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel =  context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    var oText = new sap.m.Text({
                        wrapping: false,
                        tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                    })

                    var oColProp = me._aColumns[sTabId.replace("Tab", "")].filter(fItem => fItem.ColumnName === sColumnId);
                    
                    if (oColProp && oColProp.length > 0 && oColProp[0].ValueHelp && oColProp[0].ValueHelp["items"].text && oColProp[0].ValueHelp["items"].value !== oColProp[0].ValueHelp["items"].text &&
                        oColProp[0].TextFormatMode && oColProp[0].TextFormatMode !== "Key") {
                        oText.bindText({  
                            parts: [  
                                { path: sColumnId }
                            ],  
                            formatter: function(sKey) {
                                var oValue = me.getView().getModel(oColProp[0].ValueHelp["items"].path).getData().filter(v => v[oColProp[0].ValueHelp["items"].value] === sKey);
                                
                                if (oValue && oValue.length > 0) {
                                    if (oColProp[0].TextFormatMode === "Value") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text];
                                    }
                                    else if (oColProp[0].TextFormatMode === "ValueKey") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text] + " (" + sKey + ")";
                                    }
                                    else if (oColProp[0].TextFormatMode === "KeyValue") {
                                        return sKey + " (" + oValue[0][oColProp[0].ValueHelp["items"].text] + ")";
                                    }
                                }
                                else return sKey;
                            }
                        });                        
                    }
                    else {
                        oText.bindText({  
                            parts: [  
                                { path: sColumnId }
                            ]
                        }); 
                    }

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel }),
                        template: oText,
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });                    
                });

                // oColumns.forEach(item => {
                //     var aFilterableColumns = [];
                //     aFilterableColumns.push({
                //         name: item.ColumnName
                //     });
                // })
            },

            setRowCreateMode() {
                var oTable = this.byId(this._sActiveTable);
                var aNewRow = [];
                var oNewRow = {};  

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab","")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable || ci.Creatable) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (oValueHelp) {
                                    var bValueFormatter = false;
                                    var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        bValueFormatter = true;

                                        if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                            if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                                sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                                sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                            }
                                        }
                                    }
                                    
                                    var oInput = new sap.m.Input({
                                        type: "Text",
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.ValueHelp["SuggestionItems"].path,
                                            length: 10000,
                                            template: new sap.ui.core.ListItem({
                                                key: ci.ValueHelp["SuggestionItems"].text,
                                                text: sSuggestItemText,
                                                additionalText: sSuggestItemAddtlText,
                                            }),
                                            templateShareable: false
                                        },
                                        // suggest: this.handleSuggestion.bind(this),
                                        change: this.handleValueHelpChange.bind(this)
                                    })

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode);
                                        oInput.bindValue({  
                                            parts: [{ path: sColName }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: sColName }
                                            ]
                                        });
                                    }

                                    col.setTemplate(oInput);

                                    // col.setTemplate(new sap.m.Input({
                                    //     type: "Text",
                                    //     value: "{" + sColName + "}",
                                    //     showValueHelp: true,
                                    //     valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     showSuggestion: true,
                                    //     maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    //     suggestionItems: {
                                    //         path: ci.ValueHelp["SuggestionItems"].path,
                                    //         length: 10000,
                                    //         template: new sap.ui.core.ListItem({
                                    //             key: ci.ValueHelp["SuggestionItems"].text,
                                    //             text: ci.ValueHelp["SuggestionItems"].text,
                                    //             additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                    //         }),
                                    //         templateShareable: false
                                    //     },
                                    //     // suggest: this.handleSuggestion.bind(this),
                                    //     change: this.handleValueHelpChange.bind(this)
                                    // }));
                                }
                                else if (ci.DataType === "DATETIME") {
                                    if (this._sActiveTable === "costHdrTab" && sColName === "CSDATE") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "MM/dd/yyyy",
                                            valueFormat: "MM/dd/yyyy",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }                                            
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "MM/dd/yyyy",
                                            valueFormat: "MM/dd/yyyy",
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                                else if (ci.DataType === "NUMBER") {
                                    // console.log("a3 NUMBER " + sColName);
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                        // change: this.onNumberChange.bind(this),
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + sColName + "}", editable: true}));
                                }
                                else {
                                    if (this._sActiveTable === "ioMatListTab" && sColName === "MATDESC1") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "MATNO",
                                                formatter: function (MATNO) {
                                                    if (MATNO !== "") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (this._sActiveTable === "costHdrTab" && sColName === "VERDESC") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }

                                if (ci.Mandatory) {
                                    col.getLabel().addStyleClass("sapMLabelRequired");
                                }

                                if (ci.DataType === "STRING") oNewRow[sColName] = "";
                                else if (ci.DataType === "NUMBER") oNewRow[sColName] = 0;
                                else if (ci.DataType === "BOOLEAN") oNewRow[sColName] = false;
                            }
                        })
                })

                oNewRow["NEW"] = true;
                aNewRow.push(oNewRow);

                this.byId(this._sActiveTable).getModel().setProperty("/rows", aNewRow);
                this.byId(this._sActiveTable).bindRows("/rows");
                this._dataMode = "NEW";

                oTable.focus();
            },

            setRowEditMode() {
                var oTable = this.byId(this._sActiveTable);

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab","")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (oValueHelp) {
                                    var bValueFormatter = false;
                                    var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        bValueFormatter = true;

                                        if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                            if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                                sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                                sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                            }
                                        }
                                    }
                                    
                                    var oInput = new sap.m.Input({
                                        type: "Text",
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.ValueHelp["SuggestionItems"].path,
                                            length: 10000,
                                            template: new sap.ui.core.ListItem({
                                                key: ci.ValueHelp["SuggestionItems"].text,
                                                text: sSuggestItemText,
                                                additionalText: sSuggestItemAddtlText,
                                            }),
                                            templateShareable: false
                                        },
                                        // suggest: this.handleSuggestion.bind(this),
                                        change: this.handleValueHelpChange.bind(this)
                                    })

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode)

                                        oInput.bindValue({  
                                            parts: [{ path: sColName }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: sColName }
                                            ]
                                        });
                                    }

                                    col.setTemplate(oInput);

                                    // col.setTemplate(new sap.m.Input({
                                    //     type: "Text",
                                    //     value: "{" + sColName + "}",
                                    //     showValueHelp: true,
                                    //     valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     showSuggestion: true,
                                    //     maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    //     suggestionItems: {
                                    //         path: ci.ValueHelp["SuggestionItems"].path,
                                    //         length: 10000,
                                    //         template: new sap.ui.core.ListItem({
                                    //             key: ci.ValueHelp["SuggestionItems"].text,
                                    //             text: ci.ValueHelp["SuggestionItems"].text,
                                    //             additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                    //         }),
                                    //         templateShareable: false
                                    //     },
                                    //     // suggest: this.handleSuggestion.bind(this),
                                    //     change: this.handleValueHelpChange.bind(this)
                                    // }));                                   
                                }
                                else if (ci.DataType === "DATETIME") {
                                    if (this._sActiveTable === "costHdrTab" && sColName === "CSDATE") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "MM/dd/yyyy",
                                            valueFormat: "MM/dd/yyyy",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }                                            
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "MM/dd/yyyy",
                                            valueFormat: "MM/dd/yyyy",
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                                else if (ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: {
                                            path: sColName,
                                            formatOptions: {
                                                minFractionDigits: ci.Decimal,
                                                maxFractionDigits: ci.Decimal
                                            },
                                            constraints: {
                                                precision: ci.Length,
                                                scale: ci.Decimal
                                            }
                                        },
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    if (this._sActiveTable === "ioMatListTab" && sColName === "MATDESC1") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "MATNO",
                                                formatter: function (MATNO) {
                                                    if (MATNO !== "") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (this._sActiveTable === "costHdrTab" && sColName === "VERDESC") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }

                                if (ci.Mandatory) {
                                    col.getLabel().addStyleClass("sapMLabelRequired");
                                }
                            }
                        })
                })
            },

            setRowReadMode() {
                var oTable = this.byId(this._sActiveTable);
                var sColName = "";

                oTable.getColumns().forEach((col, idx) => {
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab","")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp && ci.ValueHelp["items"].text && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                col.setTemplate(new sap.m.Text({
                                    text: {
                                        parts: [  
                                            { path: sColName }
                                        ],  
                                        formatter: function(sKey) {
                                            var oValue = me.getView().getModel(ci.ValueHelp["items"].path).getData().filter(v => v[ci.ValueHelp["items"].value] === sKey);
                                            
                                            if (oValue && oValue.length > 0) {
                                                if (ci.TextFormatMode === "Value") {
                                                    return oValue[0][ci.ValueHelp["items"].text];
                                                }
                                                else if (ci.TextFormatMode === "ValueKey") {
                                                    return oValue[0][ci.ValueHelp["items"].text] + " (" + sKey + ")";
                                                }
                                                else if (ci.TextFormatMode === "KeyValue") {
                                                    return sKey + " (" + oValue[0][ci.ValueHelp["items"].text] + ")";
                                                }
                                            }
                                            else return sKey;
                                        }
                                    },
                                    wrapping: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "BOOLEAN") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    editable: false
                                }));
                            }
                        })

                    col.getLabel().removeStyleClass("sapMLabelRequired");                        
                })

                this.byId(this._sActiveTable).getModel().getData().rows.forEach(item => item.EDITED = false);
            },

            onCreate: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.createData();
            },

            createData() {
                if (this._dataMode === "READ") {
                    if (this._sActiveTable === "headerTab") {
                        this.byId("btnAddHdr").setVisible(false);
                        this.byId("btnEditHdr").setVisible(false);
                        this.byId("btnDeleteHdr").setVisible(false);
                        this.byId("btnRefreshHdr").setVisible(false);
                        this.byId("btnSaveHdr").setVisible(true);
                        this.byId("btnCancelHdr").setVisible(true);
                        this.byId("btnCopyHdr").setVisible(false);
                        this.byId("btnAddNewHdr").setVisible(true);
                        this.byId("searchFieldHdr").setVisible(false);

                        this.byId("btnAddDtl").setEnabled(false);
                        this.byId("btnEditDtl").setEnabled(false);
                        this.byId("btnDeleteDtl").setEnabled(false);
                        this.byId("btnRefreshDtl").setEnabled(false);
                        this.byId("searchFieldDtl").setEnabled(false);
                    }
                    else if (this._sActiveTable === "detailTab") {
                        this.byId("btnAddDtl").setVisible(false);
                        this.byId("btnEditDtl").setVisible(false);
                        this.byId("btnDeleteDtl").setVisible(false);
                        this.byId("btnRefreshDtl").setVisible(false);
                        this.byId("btnSaveDtl").setVisible(true);
                        this.byId("btnCancelDtl").setVisible(true);
                        // this.byId("btnCopyDtl").setVisible(true);
                        this.byId("btnAddNewDtl").setVisible(true);
                        this.byId("searchFieldDtl").setVisible(false);

                        this.byId("btnAddHdr").setEnabled(false);
                        this.byId("btnEditHdr").setEnabled(false);
                        this.byId("btnDeleteHdr").setEnabled(false);
                        this.byId("btnRefreshHdr").setEnabled(false);
                        this.byId("btnCopyHdr").setEnabled(false);
                        this.byId("searchFieldHdr").setEnabled(false);
                    }
    
                    var oTable = this.byId(this._sActiveTable);
                    this._aDataBeforeChange = jQuery.extend(true, [], oTable.getModel().getData().rows);
                    this._validationErrors = [];
    
                    if (oTable.getBinding("rows").aApplicationFilters.length > 0) {
                        this._aMultiFiltersBeforeChange = this._aFilterableColumns["gmc"].filter(fItem => fItem.value !== "");                   
                        oTable.getBinding("rows").filter("", "Application");
                    }
                    
                    if (oTable.getBinding("rows").aFilters.length > 0) {
                        this._aColFilters = jQuery.extend(true, [], oTable.getBinding("rows").aFilters);
                        // this._aColFilters = oTable.getBinding("rows").aFilters;
                        oTable.getBinding("rows").aFilters = [];
                    }

                    if (oTable.getBinding("rows").aSorters.length > 0) {                        
                        this._aColSorters = jQuery.extend(true, [], oTable.getBinding("rows").aSorters);
                    }
                    
                    var oColumns = oTable.getColumns();

                    for (var i = 0, l = oColumns.length; i < l; i++) {
                        var isFiltered = oColumns[i].getFiltered();
    
                        if (isFiltered) {
                            oColumns[i].filter("");
                        }
                    }

                    this.setRowCreateMode();
                    // sap.ushell.Container.setDirtyFlag(true);
                }
            },

            onAddNewRow() {
                var oTable = this.byId(this._sActiveTable);
                var aNewRow = oTable.getModel().getData().rows;
                var oNewRow = {};  

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab","")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable || ci.Creatable) {   
                                if (ci.DataType === "STRING") oNewRow[sColName] = "";
                                else if (ci.DataType === "NUMBER") oNewRow[sColName] = 0;
                                else if (ci.DataType === "BOOLEAN") oNewRow[sColName] = false;                                
                            }
                        })
                })

                oNewRow["NEW"] = true;
                aNewRow.push(oNewRow);

                this.byId(this._sActiveTable).getModel().setProperty("/rows", aNewRow);
                this.byId(this._sActiveTable).bindRows("/rows");
                // oTable.focus();
            },

            onEdit: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.editData();
            },

            editData() {
                if (this._dataMode === "READ") {
                    if (this._sActiveTable === "headerTab") this._bHdrChanged = false;
                    else if (this._sActiveTable === "detailTab") this._bDtlChanged = false;
                    
                    if (this.byId(this._sActiveTable).getModel().getData().rows.length === 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"])
                    }
                    else {
                        if (this._sActiveTable === "headerTab") {
                            this.byId("btnAddHdr").setVisible(false);
                            this.byId("btnEditHdr").setVisible(false);
                            this.byId("btnDeleteHdr").setVisible(false);
                            this.byId("btnRefreshHdr").setVisible(false);
                            this.byId("btnSaveHdr").setVisible(true);
                            this.byId("btnCancelHdr").setVisible(true);
                            this.byId("btnCopyHdr").setVisible(false);
                            this.byId("btnAddNewDtl").setVisible(false);
                            this.byId("searchFieldHdr").setVisible(false);

                            this.byId("btnAddDtl").setEnabled(false);
                            this.byId("btnEditDtl").setEnabled(false);
                            this.byId("btnDeleteDtl").setEnabled(false);
                            this.byId("btnRefreshDtl").setEnabled(false);
                            this.byId("searchFieldDtl").setEnabled(false);
                        }
                        else if (this._sActiveTable === "detailTab") {
                            this.byId("btnAddDtl").setVisible(false);
                            this.byId("btnEditDtl").setVisible(false);
                            this.byId("btnDeleteDtl").setVisible(false);
                            this.byId("btnRefreshDtl").setVisible(false);
                            this.byId("btnSaveDtl").setVisible(true);
                            this.byId("btnCancelDtl").setVisible(true);
                            // this.byId("btnCopyDtl").setVisible(true);
                            this.byId("btnAddNewDtl").setVisible(false);
                            this.byId("searchFieldDtl").setVisible(false);

                            this.byId("btnAddHdr").setEnabled(false);
                            this.byId("btnEditHdr").setEnabled(false);
                            this.byId("btnDeleteHdr").setEnabled(false);
                            this.byId("btnRefreshHdr").setEnabled(false);
                            this.byId("btnCopyHdr").setEnabled(false);
                            this.byId("searchFieldHdr").setEnabled(false);
                        }
    
                        this._aDataBeforeChange = jQuery.extend(true, [], this.byId(this._sActiveTable).getModel().getData().rows);
                        this._validationErrors = [];
                        this._dataMode = "EDIT";
                        
                        if (this.byId(this._sActiveTable).getBinding("rows").aFilters.length > 0) {
                            this._aColFilters = me.byId(this._sActiveTable).getBinding("rows").aFilters;
                        }
    
                        if (this.byId(this._sActiveTable).getBinding("rows").aSorters.length > 0) {
                            this._aColSorters = me.byId(this._sActiveTable).getBinding("rows").aSorters;
                        }

                        this.setRowEditMode();                        
                    }
                }                
            },

            onCancel: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.cancelData();
            },

            cancelData() {
                if (this._dataMode === "NEW" || this._dataMode === "EDIT") {
                    var bChanged = false;

                    if (this._sActiveTable === "headerTab") bChanged = this._bHdrChanged;
                    else if (this._sActiveTable === "detailTab") bChanged = this._bDtlChanged;
    
                    if (bChanged) {
                        var oData = {
                            Action: "update-cancel",
                            Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                        }
    
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(oData);
    
                        if (!this._ConfirmDialog) {
                            this._ConfirmDialog = sap.ui.xmlfragment("zuicostcnfg.view.fragments.dialog.ConfirmDialog", this);
    
                            this._ConfirmDialog.setModel(oJSONModel);
                            this.getView().addDependent(this._ConfirmDialog);
                        }
                        else this._ConfirmDialog.setModel(oJSONModel);
    
                        this._ConfirmDialog.open();
                    }
                    else {
                        if (this._sActiveTable === "headerTab") {
                            this.byId("btnAddHdr").setVisible(true);
                            this.byId("btnEditHdr").setVisible(true);
                            this.byId("btnDeleteHdr").setVisible(true);
                            this.byId("btnRefreshHdr").setVisible(true);
                            this.byId("btnSaveHdr").setVisible(false);
                            this.byId("btnCancelHdr").setVisible(false);
                            this.byId("btnCopyHdr").setVisible(true);
                            this.byId("btnAddNewHdr").setVisible(false);
                            this.byId("searchFieldHdr").setVisible(true);

                            this.byId("btnAddDtl").setEnabled(true);
                            this.byId("btnEditDtl").setEnabled(true);
                            this.byId("btnDeleteDtl").setEnabled(true);
                            this.byId("btnRefreshDtl").setEnabled(true);
                            this.byId("searchFieldDtl").setEnabled(true);
                        }
                        else if (this._sActiveTable === "detailTab") {
                            this.byId("btnAddDtl").setVisible(true);
                            this.byId("btnEditDtl").setVisible(true);
                            this.byId("btnDeleteDtl").setVisible(true);
                            this.byId("btnRefreshDtl").setVisible(true);
                            this.byId("btnSaveDtl").setVisible(false);
                            this.byId("btnCancelDtl").setVisible(false);
                            // this.byId("btnCopyDtl").setVisible(false);
                            this.byId("btnAddNewDtl").setVisible(false);
                            this.byId("searchFieldDtl").setVisible(true);
    
                            this.byId("btnAddHdr").setEnabled(true);
                            this.byId("btnEditHdr").setEnabled(true);
                            this.byId("btnDeleteHdr").setEnabled(true);
                            this.byId("btnRefreshHdr").setEnabled(true);
                            this.byId("btnCopyHdr").setEnabled(true);
                            this.byId("searchFieldHdr").setEnabled(true);
                        }
    
                        // if (this.byId(this._sActiveTable).getBinding("rows")) {
                        //     me._aColFilters = this.byId(this._sActiveTable).getBinding("rows").aFilters;
                        //     me._aColSorters = this.byId(this._sActiveTable).getBinding("rows").aSorters;
                        // }

                        this.byId(this._sActiveTable).getModel().setProperty("/rows", this._aDataBeforeChange);
                        this.byId(this._sActiveTable).bindRows("/rows");

                        if (this._aColFilters.length > 0) { this.setColumnFilters(this._sActiveTable); }
                        if (this._aColSorters.length > 0) { this.setColumnSorters(this._sActiveTable); }

                        this.setRowReadMode();
                        this._dataMode = "READ";
                    }
                }
            },

            onBatchSave: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.batchSaveData();
            },

            batchSaveData() {
                if (this._dataMode === "NEW" || this._dataMode === "EDIT") {
                    var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                    var aEditedRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.EDITED === true && item.NEW !== true);
    
                    console.log(aNewRows);
                    console.log(aEditedRows);

                    if (aNewRows.length > 0) {
                        if (this._validationErrors.length === 0) {
                            this._oModel.setUseBatch(true);
                            this._oModel.setDeferredGroups(["update"]);
    
                            var proceed = true;
                            var mParameters = { groupId:"update" }
                            var sEntitySet = "/";
    
                            switch (this._sActiveTable) {
                                case "headerTab":
                                    sEntitySet += "HeaderSet"
                                    break;
                                case "detailTab":
                                    sEntitySet += "DetailSet"
                                    break;
                                default: break;
                            }
    
                            Common.openProcessingDialog(me, "Processing...");
    
                            aNewRows.forEach(item => {
                                var entitySet = sEntitySet;
                                var param = {};
    
                                this._aColumns[this._sActiveTable.replace("Tab","")].forEach(col => {
                                    if (col.Editable || col.Creatable) {
                                        if (col.DataType === "DATETIME") {
                                            if (col.ColumnName === "EFFECTDT")
                                                param[col.ColumnName] = item[col.ColumnName] === "" ? "" : sapDateFormat.format(new Date(item[col.ColumnName]));
                                            else 
                                                param[col.ColumnName] = item[col.ColumnName] === "" ? "" : sapDateFormat.format(new Date(item[col.ColumnName])) + "T00:00:00";
                                        } 
                                        else if (col.DataType === "BOOLEAN") {
                                            param[col.ColumnName] = item[col.ColumnName] === true ? "X" : "";
                                        }
                                        else {
                                            param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName] + "";
                                        }
    
                                        if (col.Mandatory && (item[col.ColumnName] + "").length === 0) proceed = false;
                                    }
                                })
    
                                if (this._sActiveTable === "detailTab") param["COSTCOMPCD"] = this.getView().getModel("ui").getData().activeComp;
                                console.log(entitySet, param)
                                this._oModel.create(entitySet, param, mParameters);
                            })
    
                            if (!proceed) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                                Common.closeProcessingDialog(me);
                            }
                            else {
                                this._oModel.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                        console.log(oResponse);
                                        var aData = me._aDataBeforeChange;

                                        oResponse.data.__batchResponses[0].__changeResponses.forEach((resp, respIdx) => {
                                            var oMessage = JSON.parse(resp.headers["sap-message"]);
        
                                            if (oMessage.severity === "success") {
                                                aNewRows.forEach((nr, nrIndex) => {
                                                    if (nrIndex === respIdx) {
                                                        //set SEQ assigned from backend
                                                        nr.SEQ = oMessage.message;

                                                        //merge data
                                                        aData.push(nr);
                                                    }
                                                })
                                            }
                                        })

                                        //merge data
                                        // aNewRows.forEach(item => aData.push(item));

                                        me.byId(me._sActiveTable).getModel().setProperty("/rows", aData);
                                        me.byId(me._sActiveTable).bindRows("/rows");

                                        if (me._sActiveTable === "headerTab") {
                                            me.byId("btnAddHdr").setVisible(true);
                                            me.byId("btnEditHdr").setVisible(true);
                                            me.byId("btnDeleteHdr").setVisible(true);
                                            me.byId("btnRefreshHdr").setVisible(true);
                                            me.byId("btnSaveHdr").setVisible(false);
                                            me.byId("btnCancelHdr").setVisible(false);
                                            me.byId("btnCopyHdr").setVisible(true);
                                            me.byId("btnAddNewDtl").setVisible(false);
                                            me.byId("searchFieldHdr").setVisible(true);

                                            me.byId("btnAddDtl").setEnabled(true);
                                            me.byId("btnEditDtl").setEnabled(true);
                                            me.byId("btnDeleteDtl").setEnabled(true);
                                            me.byId("btnRefreshDtl").setEnabled(true);
                                            me.byId("searchFieldDtl").setEnabled(true);

                                            me.getView().getModel("counts").setProperty("/header", aData.length);
                                        }
                                        else if (me._sActiveTable === "detailTab") {
                                            me.byId("btnAddDtl").setVisible(true);
                                            me.byId("btnEditDtl").setVisible(true);
                                            me.byId("btnDeleteDtl").setVisible(true);
                                            me.byId("btnRefreshDtl").setVisible(true);
                                            me.byId("btnSaveDtl").setVisible(false);
                                            me.byId("btnCancelDtl").setVisible(false);
                                            // me.byId("btnCopyDtl").setVisible(false);
                                            me.byId("btnAddNewDtl").setVisible(false);
                                            me.byId("searchFieldDtl").setVisible(true);

                                            me.byId("btnAddHdr").setEnabled(true);
                                            me.byId("btnEditHdr").setEnabled(true);
                                            me.byId("btnDeleteHdr").setEnabled(true);
                                            me.byId("btnRefreshHdr").setEnabled(true);
                                            me.byId("btnCopyHdr").setEnabled(true);
                                            me.byId("searchFieldHdr").setEnabled(true);

                                            me.getView().getModel("counts").setProperty("/detail", aData.length);
                                        }

                                        if (me._aColFilters.length > 0) { me.setColumnFilters(me._sActiveTable); }
                                        if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                        me._dataMode = "READ";
                                        Common.closeProcessingDialog(me);
                                        me.setRowReadMode();                                        
                                        // me.refreshData();
                                    },
                                    error: function () {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            }
                        }
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        }
                    }
                    else if (aEditedRows.length > 0) {
                        if (this._validationErrors.length === 0) {                      
                            var sEntitySet = "/";
                            var proceed = true;
    
                            if (this._sActiveTable === "headerTab") sEntitySet += "HeaderSet(";
                            else sEntitySet += "DetailSet(";
    
                            this._oModel.setUseBatch(true);
                            this._oModel.setDeferredGroups(["update"]);
    
                            var mParameters = {
                                "groupId":"update"
                            }
    
                            Common.openProcessingDialog(me, "Processing...");
    
                            aEditedRows.forEach(item => {
                                var entitySet = sEntitySet;
                                var param = {};
                                var iKeyCount = this._aColumns[this._sActiveTable.replace("Tab","")].filter(col => col.Key === "X").length;
                                var itemValue;
                                // console.log(this._aColumns[arg])
                                this._aColumns[this._sActiveTable.replace("Tab","")].forEach(col => {
                                    if (col.DataType === "DATETIME") {
                                        if (col.ColumnName === "EFFECTDT")
                                            itemValue = sapDateFormat2.format(new Date(item[col.ColumnName]));
                                        else 
                                            itemValue = sapDateFormat.format(new Date(item[col.ColumnName])) + "T00:00:00";
                                    } 
                                    else if (col.DataType === "BOOLEAN") {
                                        param[col.ColumnName] = item[col.ColumnName] === true ? "X" : "";
                                    }
                                    else {
                                        itemValue = item[col.ColumnName];
                                    }
    
                                    if (col.Editable) {
                                        param[col.ColumnName] = itemValue;
    
                                        if (col.Mandatory && (item[col.ColumnName] + "").length === 0) proceed = false;
                                    }
    
                                    if (iKeyCount === 1) {
                                        if (col.Key === "X")
                                            entitySet += "'" + itemValue + "'"
                                    }
                                    else if (iKeyCount > 1) {
                                        if (col.Key === "X") {
                                            entitySet += col.ColumnName + "='" + itemValue + "',"
                                        }
                                    }
                                })
    
                                if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                entitySet += ")";
    
                                this._oModel.update(entitySet, param, mParameters);
                            })
    
                            if (!proceed) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                                Common.closeProcessingDialog(me);
                            }
                            else {
                                this._oModel.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                        if (me._sActiveTable === "headerTab") {
                                            me.byId("btnAddHdr").setVisible(true);
                                            me.byId("btnEditHdr").setVisible(true);
                                            me.byId("btnDeleteHdr").setVisible(true);
                                            me.byId("btnRefreshHdr").setVisible(true);
                                            me.byId("btnSaveHdr").setVisible(false);
                                            me.byId("btnCancelHdr").setVisible(false);
                                            me.byId("btnCopyHdr").setVisible(true);
                                            me.byId("btnAddNewDtl").setVisible(false);
                                            me.byId("searchFieldHdr").setVisible(true);

                                            me.byId("btnAddDtl").setEnabled(true);
                                            me.byId("btnEditDtl").setEnabled(true);
                                            me.byId("btnDeleteDtl").setEnabled(true);
                                            me.byId("btnRefreshDtl").setEnabled(true);
                                            me.byId("searchFieldDtl").setEnabled(true);
                                        }
                                        else if (me._sActiveTable === "detailTab") {
                                            me.byId("btnAddDtl").setVisible(true);
                                            me.byId("btnEditDtl").setVisible(true);
                                            me.byId("btnDeleteDtl").setVisible(true);
                                            me.byId("btnRefreshDtl").setVisible(true);
                                            me.byId("btnSaveDtl").setVisible(false);
                                            me.byId("btnCancelDtl").setVisible(false);
                                            // me.byId("btnCopyDtl").setVisible(false);
                                            me.byId("btnAddNewDtl").setVisible(false);
                                            me.byId("searchFieldDtl").setVisible(true);
                    
                                            me.byId("btnAddHdr").setEnabled(true);
                                            me.byId("btnEditHdr").setEnabled(true);
                                            me.byId("btnDeleteHdr").setEnabled(true);
                                            me.byId("btnRefreshHdr").setEnabled(true);
                                            me.byId("btnCopyHdr").setEnabled(true);
                                            me.byId("searchFieldHdr").setEnabled(true);
                                        }
        
                                        if (me._aColFilters.length > 0) { me.setColumnFilters(me._sActiveTable); }
                                        if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                        me._dataMode = "READ";
                                        Common.closeProcessingDialog(me);
                                        me.setRowReadMode();
                                        // me.refreshData();
                                    },
                                    error: function () {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            }
                        }
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        }
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                    }
                }
            },
            
            onCloseConfirmDialog: function (oEvent) {
                if (this._ConfirmDialog.getModel().getData().Action === "update-cancel") {
                    if (this._sActiveTable === "headerTab") {
                        this.byId("btnAddHdr").setVisible(true);
                        this.byId("btnEditHdr").setVisible(true);
                        this.byId("btnDeleteHdr").setVisible(true);
                        this.byId("btnRefreshHdr").setVisible(true);
                        this.byId("btnSaveHdr").setVisible(false);
                        this.byId("btnCancelHdr").setVisible(false);
                        this.byId("btnCopyHdr").setVisible(true);
                        this.byId("btnAddNewDtl").setVisible(false);
                        this.byId("searchFieldHdr").setVisible(true);

                        this.byId("btnAddDtl").setEnabled(true);
                        this.byId("btnEditDtl").setEnabled(true);
                        this.byId("btnDeleteDtl").setEnabled(true);
                        this.byId("btnRefreshDtl").setEnabled(true);
                        this.byId("searchFieldDtl").setEnabled(true);
                    }
                    else if (this._sActiveTable === "detailTab") {
                        this.byId("btnAddDtl").setVisible(true);
                        this.byId("btnEditDtl").setVisible(true);
                        this.byId("btnDeleteDtl").setVisible(true);
                        this.byId("btnRefreshDtl").setVisible(true);
                        this.byId("btnSaveDtl").setVisible(false);
                        this.byId("btnCancelDtl").setVisible(false);
                        // this.byId("btnCopyDtl").setVisible(false);
                        this.byId("btnAddNewDtl").setVisible(false);
                        this.byId("searchFieldDtl").setVisible(true);

                        this.byId("btnAddHdr").setEnabled(true);
                        this.byId("btnEditHdr").setEnabled(true);
                        this.byId("btnDeleteHdr").setEnabled(true);
                        this.byId("btnRefreshHdr").setEnabled(true);
                        this.byId("btnCopyHdr").setEnabled(true);
                        this.byId("searchFieldHdr").setEnabled(true);
                    }                    

                    this.byId(this._sActiveTable).getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(this._sActiveTable).bindRows("/rows");

                    if (this._aColFilters.length > 0) { this.setColumnFilters(this._sActiveTable); }
                    if (this._aColSorters.length > 0) { this.setColumnSorters(this._sActiveTable); }

                    this.setRowReadMode();
                    this._dataMode = "READ";
                    this.setActiveRowHighlightByTableId(this._sActiveTable);
                }

                this._ConfirmDialog.close();
            },

            onCancelConfirmDialog: function (oEvent) {
                this._ConfirmDialog.close();
            },

            onDelete: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.deleteData();
            },

            deleteData() {
                if (this._dataMode === "READ") {
                    var oTable = this.byId(this._sActiveTable);
                    var aSelIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel().getData().rows;
                    var vEntitySet = "/";
    
                    if (this._sActiveTable === "headerTab") vEntitySet += "HeaderSet(";
                    else vEntitySet += "DetailSet(";
    
                    this._oModel.setUseBatch(true);
                    this._oModel.setDeferredGroups(["update"]);
    
                    var mParameters = {
                        "groupId":"update"
                    }
    
                    if (aSelIndices.length > 0) {
                        aSelIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })
    
                        aSelIndices = oTmpSelectedIndices;
   
                        MessageBox.confirm("Proceed to delete " + aSelIndices.length + " record(s)?", {
                            actions: ["Yes", "No"],
                            onClose: function (sAction) {
                                if (sAction === "Yes") {
                                    Common.openProcessingDialog(me, "Processing...");
    
                                    if (me.byId(me._sActiveTable).getBinding("rows").aFilters.length > 0) {
                                        me._aColFilters = me.byId(me._sActiveTable).getBinding("rows").aFilters;
                                    }
                
                                    if (me.byId(me._sActiveTable).getBinding("rows").aSorters.length > 0) {
                                        me._aColSorters = me.byId(me._sActiveTable).getBinding("rows").aSorters;
                                    }

                                    aSelIndices.forEach(item => {
                                        var entitySet = vEntitySet;
                                        var iKeyCount = me._aColumns[me._sActiveTable.replace("Tab","")].filter(col => col.Key === "X").length;
                                        var itemValue;

                                        me._aColumns[me._sActiveTable.replace("Tab","")].forEach(col => {
                                            if (col.DataType === "DATETIME") {
                                                if (col.ColumnName === "EFFECTDT")
                                                    itemValue = sapDateFormat2.format(new Date(aData.at(item)[col.ColumnName]));
                                                else 
                                                    itemValue = sapDateFormat.format(new Date(aData.at(item)[col.ColumnName])) + "T00:00:00";
                                            } 
                                            else if (col.DataType === "BOOLEAN") {
                                                param[col.ColumnName] = aData.at(item)[col.ColumnName] === true ? "X" : "";
                                            }
                                            else {
                                                itemValue = aData.at(item)[col.ColumnName];
                                            }

                                            if (iKeyCount === 1) {
                                                if (col.Key === "X")
                                                    entitySet += "'" + itemValue + "'"
                                            }
                                            else if (iKeyCount > 1) {
                                                if (col.Key === "X") {
                                                    entitySet += col.ColumnName + "='" + itemValue + "',"
                                                }
                                            }
                                        })
                    
                                        if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                        entitySet += ")";
                    
                                        console.log(entitySet);
                                        // console.log(param);
                                        me._oModel.remove(entitySet, mParameters);
                                    })
                
                                    me._oModel.submitChanges({
                                        groupId: "update",
                                        success: function (oData, oResponse) {
                                            Common.closeProcessingDialog(me);
                                            // me.refreshData();
                                            aSelIndices.sort((a, b) => -1);
                                            // console.log(aSelIndices)

                                            aSelIndices.forEach(item => {
                                                aData.splice(item, 1);
                                            })

                                            // console.log(aData);

                                            me.byId(me._sActiveTable).getModel().setProperty("/rows", aData);
                                            me.byId(me._sActiveTable).bindRows("/rows");

                                            if (me._aColFilters.length > 0) { me.setColumnFilters(me._sActiveTable); }
                                            if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                            me.getView().getModel("counts").setProperty("/header", aData.length);

                                            MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_DELETED"]);
                                        },
                                        error: function () {
                                            Common.closeProcessingDialog(me);
                                        }
                                    }) 
                                }
                            }                        
                        })
                    }   
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                    }
                }          
            },

            onRefresh: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.refreshData();
            },

            refreshData() {
                if (this._dataMode === "READ") {
                    this._aColFilters = me.byId(this._sActiveTable).getBinding("rows").aFilters;
                    this._aColSorters = me.byId(this._sActiveTable).getBinding("rows").aSorters;

                    if (this._sActiveTable === "headerTab") {
                        this.getHeaderData();
                    }
                    else if (this._sActiveTable === "detailTab") {
                        this.getDetailData(true);
                    }
                }
            },

            onCopy: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.copyData();
            },

            copyData() {
                if (this._dataMode === "READ") {
                    var oTable = this.byId(this._sActiveTable);
                    var aSelIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel().getData().rows;
                    var sEntitySet = "/HeaderSet"
    
                    if (aSelIndices.length > 0) {
                        aSelIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })
    
                        aSelIndices = oTmpSelectedIndices;
    
                        this._oModel.setUseBatch(true);
                        this._oModel.setDeferredGroups(["update"]);
    
                        var mParameters = { groupId:"update" }
                        Common.openProcessingDialog(me, "Processing...");

                        aSelIndices.forEach(item => {
                            var entitySet = sEntitySet;
                            var param = {};

                            this._aColumns[this._sActiveTable.replace("Tab","")].forEach(col => {
                                if (col.Editable || col.Creatable) {
                                    if (col.DataType === "DATETIME") {
                                        if (col.ColumnName === "EFFECTDT")
                                            param[col.ColumnName] = aData.at(item)[col.ColumnName] === "" ? "" : sapDateFormat.format(new Date(aData.at(item)[col.ColumnName]));
                                        else 
                                            param[col.ColumnName] = aData.at(item)[col.ColumnName] === "" ? "" : sapDateFormat.format(new Date(aData.at(item)[col.ColumnName])) + "T00:00:00";
                                    } 
                                    else if (col.DataType === "BOOLEAN") {
                                        param[col.ColumnName] = aData.at(item)[col.ColumnName] === true ? "X" : "";
                                    }
                                    else {
                                        param[col.ColumnName] = aData.at(item)[col.ColumnName] === "" ? "" : aData.at(item)[col.ColumnName] + "";
                                    }
                                }
                            })

                            // console.log(param)
                            this._oModel.create(entitySet, param, mParameters);
                        })
    
                        this._oModel.submitChanges({
                            groupId: "update",
                            success: function (oData, oResponse) {
                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_COPIED"]);
                                Common.closeProcessingDialog(me);
                                me.refreshData();
                            },
                            error: function () {
                                Common.closeProcessingDialog(me);
                            }
                        })
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                    } 
                }
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (this.byId(oEvent.srcControl.sId).getBindingContext()) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext().sPath;

                        oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                        oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
                else if (oEvent.key === "Enter" && oEvent.srcControl.sParentAggregationName === "cells") {
                    if (this._dataMode === "NEW") this.onAddNewRow();
                }               
            },

            onAfterTableRendering: function (oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlightByTableId(this._tableRendered);
                    this._tableRendered = "";
                }
            },

            setActiveRowHighlightByTable(arg) {
                var oTable = arg;

                setTimeout(() => {
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            setActiveRowHighlightByTableId(arg) {
                var oTable = this.byId(arg);

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 10);
            },

            onInputLiveChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);                    

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onNumberChange: function (oEvent) {
                var decPlaces = oEvent.getSource().getBindingInfo("value").constraints.scale;

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > decPlaces) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of " + decPlaces + " decimal places.");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onNumberLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var vColDecPlaces = oSource.getBindingInfo("value").constraints.scale;
                var vColLength = oSource.getBindingInfo("value").constraints.precision;

                if (oEvent.getParameters().value.split(".")[0].length > (vColLength - vColDecPlaces)) {
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Enter a number with a maximum whole number length of " + (vColLength - vColDecPlaces));

                    if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                        this._validationErrors.push(oEvent.getSource().getId());
                    }
                }
                else if (oEvent.getParameters().value.split(".").length > 1) {
                    if (vColDecPlaces === 0) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number without decimal place/s");
                        
                        if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                            this._validationErrors.push(oEvent.getSource().getId());
                        }
                    }
                    else {
                        if (oEvent.getParameters().value.split(".")[1].length > vColDecPlaces) {
                            oEvent.getSource().setValueState("Error");
                            oEvent.getSource().setValueStateText("Enter a number with a maximum of " + vColDecPlaces.toString() + " decimal places");
                            
                            if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                                this._validationErrors.push(oEvent.getSource().getId());
                            }
                        }
                        else {
                            oEvent.getSource().setValueState("None");
                            this._validationErrors.forEach((item, index) => {
                                if (item === oEvent.getSource().getId()) {
                                    this._validationErrors.splice(index, 1);
                                }
                            })
                        }
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1);
                        }
                    })
                }

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;                
            },

            handleValueHelp: function (oEvent) {
                var oSource = oEvent.getSource();
                var sModel = this._sActiveTable.replace("Tab","");

                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputKey = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;
                
                var vColProp = this._aColumns[sModel].filter(item => item.ColumnName === this._inputField);
                var vItemValue = vColProp[0].ValueHelp.items.value;
                var vItemDesc = vColProp[0].ValueHelp.items.text;
                var sPath = vColProp[0].ValueHelp.items.path;
                var vh = this.getView().getModel(sPath).getData();
                var sTextFormatMode = vColProp[0].TextFormatMode === "" ? "Key" : vColProp[0].TextFormatMode;

                vh.forEach(item => {
                    item.VHTitle = item[vItemValue];
                    item.VHDesc = vItemValue === vItemDesc ? "" : item[vItemDesc];

                    if (sTextFormatMode === "Key") {
                        item.VHSelected = this._inputValue === item[vItemValue];
                    }
                    else if (sTextFormatMode === "Value") {
                        item.VHSelected = this._inputValue === item[vItemDesc];
                    }
                    else if (sTextFormatMode === "KeyValue") {
                        item.VHSelected = this._inputValue === (item[vItemValue] + " (" + item[vItemDesc] + ")");
                    }
                    else if (sTextFormatMode === "ValueKey") {
                        item.VHSelected = this._inputValue === (item[vItemDesc] + " (" + item[vItemValue] + ")");
                    }

                    if (item.VHSelected) { this._inputKey = item[vItemValue]; }
                })
                // console.log(this._inputKey)
                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: vColProp[0].label,
                    table: sModel
                });

                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuicostcnfg.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );

                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }

                this._valueHelpDialog.open();
            },

            handleValueHelpClose: function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
                    
                    if (oSelectedItem) {
                        // this._inputSource.setValue(oSelectedItem.getTitle());
                        this._inputSource.setSelectedKey(oSelectedItem.getTitle());
                        
                        // if (this._inputKey !== oSelectedItem.getTitle()) {
                        //     console.log(this._inputSource.getBindingInfo("value"))
                        //     var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                        //     this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                        //     if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                        //     else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
                        // }
                    }

                    this._inputSource.setValueState("None");
                }
            },

            handleValueHelpChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {                    
                    if (item.getProperty("key") === oSource.getSelectedKey()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
                // console.log(oSource.getSelectedKey())
                // var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sRowPath = oSource.oParent.getBindingContext().sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/' + oSource.getBindingInfo("value").parts[0].path, oSource.getSelectedKey());
                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);
                    
                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onCellClick: function (oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                    if (oTable.getId().indexOf("headerTab") >= 0) {
                        var vCurrComp = oTable.getModel().getProperty(sRowPath + "/COSTCOMPCD");
                        var vPrevComp = this.getView().getModel("ui").getData().activeComp;

                        if (vCurrComp !== vPrevComp) {
                            this.getView().getModel("ui").setProperty("/activeComp", vCurrComp);
                            if (this._dataMode === "READ") {
                                this.getView().getModel("ui").setProperty("/activeCompDisplay", vCurrComp);
                                this.getDetailData(false);
                            }
                        }

                        if (this._dataMode === "READ") this._sActiveTable = "headerTab";
                    }
                    else {
                        if (this._dataMode === "READ") this._sActiveTable = "detailTab";
                    }

                    // console.log(this._sActiveTable)
                    oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                    oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },

            onTableClick(oEvent) {
                var oControl = oEvent.srcControl;
                var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                while (sTabId.substr(sTabId.length - 3) !== "Tab") {                    
                    oControl = oControl.oParent;
                    sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];
                }
                
                if (this._dataMode === "READ") this._sActiveTable = sTabId;
                // console.log(this._sActiveTable);
            },

            filterGlobally: function(oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                var sQuery = oEvent.getParameter("query");

                if (sTabId === "headerTab") {
                    this.byId("searchFieldDtl").setProperty("value", "");
                }

                if (this._dataMode === "READ") this._sActiveTable = sTabId;
                this.exeGlobalSearch(sQuery, this._sActiveTable);
            },

            exeGlobalSearch(arg1, arg2) {
                var oFilter = null;
                var aFilter = [];
                
                if (arg1) {
                    this._aColumns[arg2.replace("Tab","")].forEach(item => {
                         if (item.DataType === "BOOLEAN") aFilter.push(new Filter(item.ColumnName, FilterOperator.EQ, arg1));
                        else aFilter.push(new Filter(item.ColumnName, FilterOperator.Contains, arg1));
                    })

                    oFilter = new Filter(aFilter, false);
                }
    
                this.byId(arg2).getBinding("rows").filter(oFilter, "Application");

                if (arg1 && arg2 === "headerTab") {
                    var vComp = this.byId(arg2).getModel().getData().rows.filter((item,index) => index === this.byId(arg2).getBinding("rows").aIndices[0])[0].COSTCOMPCD;
                    this.getView().getModel("ui").setProperty("/activeComp", vComp);
                    this.getView().getModel("ui").setProperty("/activeCompDisplay", vComp);
                    this.getDetailData(true);
                }
            },

            formatValueHelp: function(sValue, sPath, sKey, sText, sFormat) {
                // console.log(sValue, sPath, sKey, sText, sFormat);
                var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

                if (oValue && oValue.length > 0) {
                    if (sFormat === "Value") {
                        return oValue[0][sText];
                    }
                    else if (sFormat === "ValueKey") {
                        return oValue[0][sText] + " (" + sValue + ")";
                    }
                    else if (sFormat === "KeyValue") {
                        return sValue + " (" + oValue[0][sText] + ")";
                    }
                }
                else return sValue;
            },

            setColumnFilters(sTable) {
                if (me._aColFilters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    me._aColFilters.forEach(item => {
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => {
                                col.filter(item.oValue1);
                            })
                    })
                } 
            },

            setColumnSorters(sTable) {
                if (me._aColSorters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    me._aColSorters.forEach(item => {
                        oColumns.filter(fItem => fItem.getSortProperty() === item.sPath)
                            .forEach(col => {
                                col.sort(item.bDescending);
                            })
                    })
                } 
            },

            onValueHelpRequested: function(oEvent) {
                var aCols = {
                    "cols": [
                        {
                            "label": "Code",
                            "template": "VHTitle",
                            "width": "5rem"
                        },
                        {
                            "label": "Description",
                            "template": "VHDesc"
                        },
                        {
                            "label": "",
                            "template": "Comparison"
                        }
                    ]
                }

                var oSource = oEvent.getSource();
                var sModel = this._sActiveTable.replace("Tab","");

                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputKey = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;
                
                var vColProp = this._aColumns[sModel].filter(item => item.ColumnName === this._inputField);
                var vItemValue = vColProp[0].ValueHelp.items.value;
                var vItemDesc = vColProp[0].ValueHelp.items.text;
                var sPath = vColProp[0].ValueHelp.items.path;
                var vh = this.getView().getModel(sPath).getData();
                var sTextFormatMode = vColProp[0].TextFormatMode === "" ? "Key" : vColProp[0].TextFormatMode;

                vh.forEach(item => {
                    item.VHTitle = item[vItemValue];
                    item.VHDesc = vItemValue === vItemDesc ? "" : item[vItemDesc];

                    if (sTextFormatMode === "Key") {
                        item.VHSelected = this._inputValue === item[vItemValue];
                    }
                    else if (sTextFormatMode === "Value") {
                        item.VHSelected = this._inputValue === item[vItemDesc];
                    }
                    else if (sTextFormatMode === "KeyValue") {
                        item.VHSelected = this._inputValue === (item[vItemValue] + " (" + item[vItemDesc] + ")");
                    }
                    else if (sTextFormatMode === "ValueKey") {
                        item.VHSelected = this._inputValue === (item[vItemDesc] + " (" + item[vItemValue] + ")");
                    }

                    if (item.VHSelected) { this._inputKey = item[vItemValue]; }
                })
                // console.log(this._inputKey)
                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh
                });                

                this._oTableValueHelpDialog = sap.ui.xmlfragment("zuicostcnfg.view.fragments.valuehelp.TableValueHelpDialog", this);
                this.getView().addDependent(this._oTableValueHelpDialog);
                this._oTableValueHelpDialog.setModel(new JSONModel({
                    title: vColProp[0].ColumnLabel,
                }));
                this._oTableValueHelpDialog.getTableAsync().then(function (oTable) {
                    // console.log(oTable.isA(("sap.ui.table.Table")))
                    oTable.setModel(oVHModel);
                    // oTable.setModel(new JSONModel(aCols), "columns");
                    oTable.setRowHeight(70)
                    if (oTable.bindRows) {
                        console.log("bindRows");
                        oTable.getModel().setProperty("/columns", aCols.cols);

                        //bind the dynamic column to the table
                        oTable.bindColumns("/columns", function (index, context) {
                            // var sColumnId = context.getObject().ColumnName;
                            var sColumnLabel =  context.getObject().label;
                            // var sColumnWidth = context.getObject().ColumnWidth;
                            // var sColumnVisible = context.getObject().Visible;
                            // var sColumnSorted = context.getObject().Sorted;
                            // var sColumnSortOrder = context.getObject().SortOrder;
                            // var sColumnDataType = context.getObject().DataType;
        
                            // if (sColumnWidth === 0) sColumnWidth = 100;
        
                            var oCtrl = null;

                            if (context.getObject().template !== "Comparison") {
                                oCtrl = new sap.m.Text({
                                    text: "{" + context.getObject().template + "}",
                                    wrapping: false
                                })
                            }
                            else{
                                oCtrl = new sap.suite.ui.microchart.ComparisonMicroChart({
                                    data: me.getMicroChartProp()
                                })
                            }
        
                            return new sap.ui.table.Column({
                                // id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                                label: new sap.m.Text({ text: sColumnLabel }),
                                template: oCtrl,
                                autoResizable: true
                            });                    
                        });

                        oTable.bindAggregation("rows", "/items");
                    }

                    if (oTable.bindItems) {
                        console.log("bindItems")
                        oTable.bindAggregation("items", "/items", function () {
                            return new ColumnListItem({
                                cells: aCols.cols.map(function (column) {
                                    if (column.template !== "Comparison") {
                                        return new Label({ text: "{" + column.template + "}" });
                                    }
                                    else {
                                        return new sap.suite.ui.microchart.ComparisonMicroChart({
                                            data: [
                                                {
                                                    title: "Americas",
                                                    value: "10",
                                                    color: "Good"
                                                },
                                                {
                                                    title: "EMEA",
                                                    value: "50",
                                                    color: "Good"
                                                }
                                            ]
                                        })                                       
                                    }
                                })
                            });
                        });
                    }
    
                    this._oTableValueHelpDialog.update();
                }.bind(this));
    
                var oToken = new Token();
                oToken.setKey(this._inputSource.getSelectedKey());
                oToken.setText(this._inputSource.getValue());
                this._oTableValueHelpDialog.setTokens([oToken]);
                this._oTableValueHelpDialog.open();
            },
    
            onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
    
                if (aTokens.length > 0) {
                    this._inputSource.setSelectedKey(aTokens[0].getKey());
                }
                this._oTableValueHelpDialog.close();
            },
    
            onValueHelpCancelPress: function () {
                this._oTableValueHelpDialog.close();
            },
    
            onValueHelpAfterClose: function () {
                this._oTableValueHelpDialog.destroy();
            },

            getMicroChartProp() {
                var test = [
                    new sap.suite.ui.microchart.ComparisonMicroChartData({
                        title: "Comp1",
                        value: 10,
                        color: "Error",
                    }),
                    new sap.suite.ui.microchart.ComparisonMicroChartData({
                        title: "Comp2",
                        value: 20,
                        color: "Neutral",
                    }),
                    new sap.suite.ui.microchart.ComparisonMicroChartData({
                        title: "Comp3",
                        value: 70,
                        color: "Good",
                    })
                ];

                return test;
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;

                setTimeout(() => {
                    var oData = oTable.getModel().getData().rows;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);
    
                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;

                this.setActiveRowHighlight();
            },

            onSort: function(oEvent) {
                var oTable = oEvent.getSource();
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;

                this.setActiveRowHighlight();
            },
            
            onFilter: function(oEvent) {
                var oTable = oEvent.getSource();
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                
                this.setActiveRowHighlight();

                setTimeout(() => {
                    if (this._sActiveTable === "headerTab") {
                        this.getView().getModel("counts").setProperty("/header", this.byId(this._sActiveTable).getBinding("rows").aIndices.length);
                    }
                    else if (this._sActiveTable === "detailTab") {
                        this.getView().getModel("counts").setProperty("/detail", this.byId(this._sActiveTable).getBinding("rows").aIndices.length);
                    } 
                }, 100);
            },

            setActiveRowHighlight(sTableId) {
                var oTable = this.byId(sTableId !== undefined && sTableId !== "" ? sTableId : this._sActiveTable);
                
                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })                    
                }, 100);
            },

        });
    });
