sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/m/SearchField",
    "sap/ui/model/type/String",
    "sap/m/Token",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterGroupItem"
], function(JSONModel, Filter, FilterOperator, SearchField, typeString, Token, FilterBar, FilterGroupItem) {
	"use strict";

	return {

        setSmartFilterModel(oThis) {
            //set smartfilterbar model
            var me = oThis;
            var oModel = me.getOwnerComponent().getModel("ZVB_3DERP_COSTCNFG_FILTERS_CDS");               
            var oSmartFilter = me.getView().byId("smartFilterBar");
            oSmartFilter.setModel(oModel);

            //custom control properties 
            me._oSmartFilterCustomControlProp = {};
            me._oSmartFilterCustomControls = [];
            me._isSmartFilterModelSet = false;

            //get cds view service gateway metadata
            var oModelURI = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVB_3DERP_COSTCNFG_FILTERS_CDS");

            oModelURI.attachMetadataLoaded(null, function(){
                var oMetadata = oModelURI.getServiceMetadata();

                var oInterval = setInterval(() => {
                    if (oSmartFilter !== undefined && oSmartFilter._aFields !== null) {
                        clearInterval(oInterval);

                        //loop thru smart filter criteria
                        oSmartFilter._aFields.forEach(item => {
                            //OPTIONAL: exclude SBU, SBU is using combo box custom control instead of multi input
                            if (item.name === "EFFECTDT") { 
                                me._oSmartFilterCustomControls.push({key: item.name});
                                return; 
                            }

                            var oMultiInput = me.byId("sff" + item.name);

                            //skip filter criteria not defined in view xml file
                            if (oMultiInput === undefined) { return; }

                            var oFieldAnnotation = oMetadata.dataServices.schema[0].annotations.filter(fItem => fItem.target === item.fullName);

                            if (oFieldAnnotation.length > 0) {
                                //continue if filter criteria has metadata
                                var sFieldEntitySet = oFieldAnnotation[0].annotation[0].record.propertyValue.filter(fItem => fItem.property === "CollectionPath")[0].string;
                                var entityType = oMetadata.dataServices.schema[0].entityType.filter(fItem => fItem.name === sFieldEntitySet + "Type")[0];

                                //load the resource 
                                //OPTIONAL: excelude if mattyp, mattyp resource should be loaded on change of SBU value, see onSBUChange function
                                if (item.name !== "MATTYP") {
                                    oModel.read("/" + sFieldEntitySet, {
                                        success: function (oData) {
                                            me.getView().setModel(new JSONModel(oData.results), "sfm" + item.name);
                                        },
                                        error: function (err) { }
                                    })
                                }

                                //define custom control properties
                                me._oSmartFilterCustomControlProp[item.name] = {};
                                me._oSmartFilterCustomControlProp[item.name]["property"] = [];
                                me._oSmartFilterCustomControlProp[item.name]["label"] = item.label;
                                me._oSmartFilterCustomControlProp[item.name]["key"] = entityType.key.propertyRef[0].name;
                                me._oSmartFilterCustomControlProp[item.name]["maxLength"] = item.maxLength;
                                me._oSmartFilterCustomControlProp[item.name]["type"] = item.filterType;
                                me._oSmartFilterCustomControlProp[item.name]["desc"] = "Description";
                                me._oSmartFilterCustomControlProp[item.name]["textFormatMode"] = "Key";

                                me._oSmartFilterCustomControls.push({key: item.name});

                                //attach method/events to multi input
                                oMultiInput.attachValueHelpRequest(me._smartFilterCustomControl.onSmartFilterCustomControlValueHelp.bind(me));
                                oMultiInput.attachChange(me._smartFilterCustomControl.onSmartFilterCustomControlValueHelpChange.bind(me));
                                oMultiInput.attachSuggest(me._smartFilterCustomControl.onMultiInputSuggest.bind(me));

                                //collect the columns to show in suggestion and value help
                                var oCells = [];
                                var wDesc = false;

                                entityType.property.forEach((prop, index) => {
                                    //OPTIONAL: exclude SBU for mattyp
                                    if (item.name === "MATTYP" && prop.name === "SBU") {
                                        return;
                                    }

                                    //add field to suggestion column
                                    oMultiInput.addSuggestionColumn(new sap.m.Column({
                                        header: new sap.m.Label({ text: prop.extensions.filter(fItem => fItem.name === "label")[0].value })
                                    }))

                                    //assign data to cells
                                    oCells.push(new sap.m.Text({
                                        text: { path: "sfm" + item.name + ">" + prop.name }
                                    }))

                                    //add field to custom control property
                                    me._oSmartFilterCustomControlProp[item.name]["property"].push({
                                        name: prop.name,
                                        label: prop.extensions.filter(fItem => fItem.name === "label")[0].value
                                    })

                                    //if there is a description field in your resource, text format will display description + (key), otherwise will only show key
                                    if (prop.name.toUpperCase() === "DESCRIPTION" && !wDesc) {
                                        wDesc = true;
                                        me._oSmartFilterCustomControlProp[item.name]["desc"] = prop.name;
                                        me._oSmartFilterCustomControlProp[item.name]["textFormatMode"] = "ValueKey"; 
                                    }
                                })

                                //bind suggestion rows
                                oMultiInput.bindSuggestionRows({
                                    path: "sfm" + item.name + ">/",
                                    template: new sap.m.ColumnListItem({
                                        cells: oCells
                                    }),
                                    length: 10000,
                                    templateShareable: false
                                });

                                //add multi input validator for checking if entered value exists on the resource
                                oMultiInput.addValidator(me._smartFilterCustomControl.onMultiInputValidate.bind(me));

                                //add focus event in multi input to set the active custom control
                                var oMultiInputEventDelegate = { 
                                    onclick: function(oEvent) {
                                        me._smartFilterCustomControl.onMultiInputFocus(me, oEvent);
                                    }
                                };

                                oMultiInput.addEventDelegate(oMultiInputEventDelegate);
                            }
                        });

                        me._isSmartFilterModelSet = true;
                    }
                }, 100);
            }, null);
        },

        onSmartFilterCustomControlValueHelp: function(oEvent) {
            var oSource = oEvent.getSource();
            var sFieldName = oSource.getProperty("name");
            var aCols = [];

            this._oSmartFilterCustomControl = this.byId("sff" + sFieldName);

            this._oSmartFilterCustomControlProp[sFieldName].property.forEach(prop => {
                aCols.push({
                    label: prop.label,
                    template: prop.name,
                    sortProperty: prop.name
                })
            })

            this._oSmartFilterCustomControlBasicSearchField = new SearchField({
                showSearchButton: false
            });

            this._oSmartFilterCustomControlValueHelpDialog = sap.ui.xmlfragment("zuicostcnfg.view.fragments.valuehelp.SmartFilterCustomControlValueHelpDialog", this);
            this.getView().addDependent(this._oSmartFilterCustomControlValueHelpDialog);

            this._oSmartFilterCustomControlValueHelpDialog.setRangeKeyFields([{
                label: this._oSmartFilterCustomControlProp[sFieldName].label,
                key: this._oSmartFilterCustomControlProp[sFieldName].key,
                type: this._oSmartFilterCustomControlProp[sFieldName].type,
                typeInstance: new typeString({}, {
                    maxLength: this._oSmartFilterCustomControlProp[sFieldName].maxLength
                })
            }]);

            this._oSmartFilterCustomControlValueHelpDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(new JSONModel({ cols: aCols }), "columns");
                oTable.setBusy(true);

                var oInterval = setInterval(() => {
                    if (this.getView().getModel("sfm" + sFieldName) !== undefined) {
                        clearInterval(oInterval);

                        oTable.setModel(this.getView().getModel("sfm" + sFieldName));

                        if (oTable.bindRows) {
                            oTable.bindAggregation("rows", "/");
                        }

                        this._oSmartFilterCustomControlValueHelpDialog.update();
                        oTable.setBusy(false);
                    }
                }, 100);
            }.bind(this));

            
            this._oSmartFilterCustomControlValueHelpDialog.setTokens(oSource.getTokens());
            this._oSmartFilterCustomControlValueHelpDialog.setTitle(this._oSmartFilterCustomControlProp[sFieldName].label);
            this._oSmartFilterCustomControlValueHelpDialog.setKey(this._oSmartFilterCustomControlProp[sFieldName].key);
            this._oSmartFilterCustomControlValueHelpDialog.setDescriptionKey(this._oSmartFilterCustomControlProp[sFieldName].desc);
            this._oSmartFilterCustomControlValueHelpDialog.open();

            this._oSmartFilterCustomControlValueHelpDialog.attachOk(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpOkPress.bind(this));
            this._oSmartFilterCustomControlValueHelpDialog.attachCancel(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpCancelPress.bind(this));
            this._oSmartFilterCustomControlValueHelpDialog.attachAfterClose(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpAfterClose.bind(this));

            var oFilterBar = new FilterBar({
                advancedMode: true,
                search: this._smartFilterCustomControl.onSmartFilterBarCustomControlSearch.bind(this)
            });

            this._oSmartFilterCustomControlProp[sFieldName].property.forEach(prop => {
                oFilterBar.addFilterGroupItem(new FilterGroupItem({
                    groupName: "__$INTERNAL$",
                    name: prop.name,
                    label: prop.label,
                    control: new sap.m.Input({
                        name: prop.name
                    })
                }))
            })

            this._oSmartFilterCustomControlValueHelpDialog.setFilterBar(oFilterBar);
        },

        onSmartFilterCustomControlValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            var sTextFormatMode = this._oSmartFilterCustomControlProp[this._oSmartFilterCustomControl.getProperty("name")].textFormatMode;

            if (sTextFormatMode === "Key") {
                aTokens.forEach(t => {
                    t.setProperty("text", t.getProperty("key"));
                })
            }

            this._oSmartFilterCustomControl.setTokens(aTokens);
            this._oSmartFilterCustomControlValueHelpDialog.close();
        },

        onSmartFilterCustomControlValueHelpCancelPress: function () {
            this._oSmartFilterCustomControlValueHelpDialog.close();
        },

        onSmartFilterCustomControlValueHelpAfterClose: function () {
            this._oSmartFilterCustomControlValueHelpDialog.destroy();
        },

        onSmartFilterBarCustomControlSearch: function (oEvent) {
            var sSearchQuery = this._oSmartFilterCustomControlBasicSearchField.getValue(),
                aSelectionSet = oEvent.getParameter("selectionSet");

            var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }

                return aResult;
            }, []);

            this._smartFilterCustomControl.filterTable(this, new Filter({
                filters: aFilters,
                and: true
            }));
        },

        filterTable: function (oThis, oFilter) {
            var oValueHelpDialog = oThis._oSmartFilterCustomControlValueHelpDialog;

            oValueHelpDialog.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(oFilter);
                }

                oValueHelpDialog.update();
            });
        },

        onSmartFilterCustomControlValueHelpChange: function(oEvent) {
            var oSource = oEvent.getSource();
            var sFieldName = oSource.getProperty("name");

            if (oEvent.getParameter("value") === "") {
                this.byId("sff" + sFieldName).setValueState("None");
            }
        },

        onMultiInputValidate: function(oArgs) {
            // console.log(oArgs)
            if (oArgs.suggestionObject) {
                var sFieldName = oArgs.suggestionObject.oParent.oParent.oParent.getProperty("name");
                var aFieldProp = this._oSmartFilterCustomControlProp[sFieldName].property;
                var oObject = oArgs.suggestionObject.getBindingContext("sfm" + sFieldName).getObject();
                var oMultiInput = this.byId("sff" + sFieldName);
                var aToken = oMultiInput.getTokens();
                var vCount = 0;

                if (aToken.length > 0) {
                    vCount = aToken.filter(fItem => fItem.getProperty("key") === oObject[aFieldProp[0].name]).length;
                }

                if (vCount === 0) {
                    var oToken = new Token();
                    var sTextFormatMode = this._oSmartFilterCustomControlProp[sFieldName].textFormatMode;

                    if (sTextFormatMode === "Key") {
                        oToken.setKey(oObject[aFieldProp[0].name]);
                        oToken.setText(oObject[aFieldProp[0].name]);
                    }
                    else if (sTextFormatMode === "ValueKey") {
                        oToken.setKey(oObject[aFieldProp[0].name]);
                        oToken.setText(oObject[aFieldProp[1].name] + " (" + oObject[aFieldProp[0].name] + ")");
                    }

                    aToken.push(oToken);
                }

                oMultiInput.setTokens(aToken);
                oMultiInput.setValueState("None");
            }
            else if (oArgs.text !== "") {
                this._oSmartFilterCustomControl.setValueState("Error");
            }

            return null;
        },

        onMultiInputSuggest: function(oEvent) {
            //override the default filtering "StartsWidth" to "Contains"
            var oInputSource = oEvent.getSource();
            var sSuggestValue = oEvent.getParameter("suggestValue").toLowerCase();
            var aFilters = [];
            var oFilter = null;
            
            if (oInputSource.getSuggestionRows().length === 0){
                oInputSource.getBinding("suggestionRows").filter(null);
            }

            if (oInputSource.getSuggestionRows().length > 0) {
                oInputSource.getSuggestionRows()[0].getCells().forEach(cell => {
                    aFilters.push(new Filter(cell.getBinding("text").sPath, FilterOperator.Contains, sSuggestValue))
                })

                oFilter = new Filter(aFilters, false);

                oInputSource.getBinding("suggestionRows").filter(oFilter);
                oInputSource.setShowSuggestion(true);
                oInputSource.setFilterSuggests(false);
            }
        },

        onMultiInputFocus(oThis, oEvent) {
            if (oEvent.srcControl instanceof sap.m.Input) {
                oThis._oSmartFilterCustomControl = oThis.byId("sff" + oEvent.srcControl.getProperty("name"));
            }
        },

        beforeVariantFetch(oThis) {
            var me = oThis;
            var oSmartFilter = me.byId("smartFilterBar");

            if (me._oSmartFilterCustomControls !== undefined) {
                var oCustom = {};

                me._oSmartFilterCustomControls.forEach(item => {
                    var aKeyText = [];

                    if (item.key === "SBU") {
                        aKeyText.push({
                            Key: me.getView().getModel("ui").getData().sbu,
                            Text: me.getView().getModel("ui").getData().sbu
                        })
                    }
                    else {
                        var oCtrl = me.getView().byId("smartFilterBar").determineControlByName(item.key);
                        // console.log(oCtrl)
                        if (oCtrl && (!oCtrl instanceof sap.m.DateRangeSelection)) {
                            oCtrl.getTokens().map(function(oToken) {
                                aKeyText.push({
                                    Key: oToken.getKey(),
                                    Text: oToken.getText()
                                })
                            })
                        }
                    }

                    if (aKeyText.length > 0) {
                        oCustom[item.key] = aKeyText;
                    }
                })

                oSmartFilter.setFilterData({ _CUSTOM : oCustom });
            }
        },

        afterVariantLoad(oThis) {
            var me = oThis;
            var oSmartFilter = me.byId("smartFilterBar");
            var oSmartFilterData = oSmartFilter.getFilterData();
            var oSmartFilterCustomData = oSmartFilterData["_CUSTOM"];

            //clear custom control values
            oSmartFilter.getControlConfiguration().forEach(item => {
                if (me.byId("sff" + item.getProperty("key")) !== undefined) {
                    me.byId("sff" + item.getProperty("key")).destroyTokens();
                }
            })

            if (oSmartFilterCustomData !== undefined) {
                Object.keys(oSmartFilterCustomData).forEach(prop => {
                    if (prop === "SBU") {
                        //load sbu model value
                        var vPrevSBU = me.getView().getModel("ui").getData().sbu;
                        var vSBU = "";
    
                        if (oSmartFilterCustomData[prop].length > 0) {
                            vSBU = oSmartFilterCustomData[prop][0].Key;
                        }

                        me.getView().getModel("ui").setProperty("/sbu", vSBU);
    
                        if (vPrevSBU !== vSBU) {
                            me.onSBUChange();
                        }
                    }
                    else {
                        //load multi input custom control values
                        var oCustomControl = me.byId("sff" + prop);
                        var sTextFormatMode = me._oSmartFilterCustomControlProp[prop].textFormatMode;
                        var aToken = [];
    
                        if (oSmartFilterCustomData[prop].length > 0) {
                            oSmartFilterCustomData[prop].forEach(item => {
                                var oToken = new Token();
    
                                if (sTextFormatMode === "Key") {
                                    oToken.setKey(item.Key);
                                    oToken.setText(item.Text);
                                }
                                else if (sTextFormatMode === "ValueKey") {
                                    oToken.setKey(item.Key);
                                    oToken.setText(item.Text + " (" + item.Key + ")");
                                }
    
                                aToken.push(oToken);
                            })
                        }
    
                        oCustomControl.setTokens(aToken);
                    }
                })
            }
        },

        clearSmartFilters(oThis) {
            var me = oThis;

            me._oSmartFilterCustomControls.forEach(item => {
                if (item.key === "SBU") {
                    me.getView().getModel("ui").setProperty("/sbu", "");
                }
                else {
                    var oCustomControl = me.byId("sff" + item.key);
                    oCustomControl.destroyTokens();
                }
            })
        }

	};
});