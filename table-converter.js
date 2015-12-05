"use strict";
//test git hub
(function($) {

    var TC = {}; //for globals
    TC.savedStatesArray = []; //to be used to push in saved states - and then recalled with undo()

    //helper plugins and general functions

    $.fn.changeElementType = function(newType, keepAttrs) { ///change element type jQuery plugin
        
        if (keepAttrs){
            var attrs = {};
            $.each(this[0].attributes, function(idx, attr) {
                attrs[attr.nodeName] = attr.nodeValue;
            });
            this.replaceWith(function() {
                return $("<" + newType + "/>", attrs ).append($(this).contents());
            });
        
        } else {
            this.replaceWith(function() {
                return $("<" + newType + "/>").append($(this).contents());
            });
        }



    };


    $.fn.reverse = [].reverse; ///jQery reverse plugin

    $.fn.fadeAway = function(callback) { //jQuery fade out and remove
        callback = callback || function() {
            return false;
        };

        this.fadeOut(100, function() {
            $(this).remove();
            callback();
        });
    };

    String.prototype.rtrim = function() { //Right trim 
        var trimmed = this.replace(/\s+$/g, '');
        return trimmed;
    };

    String.prototype.ltrim = function() { //Right trim 
        var trimmed = this.replace(/^\s+/g, '');
        return trimmed;
    };

    function log(val) { //shortcut for console.log
        return console.log(val);
    }

    function unselectCells() { //removes selected class (yellow)
        $(".selected").removeClass("selected");
    }

    function stripeRows($resultTable) {
        $("tbody tr", $resultTable).removeClass("greenbar");
        $("tbody tr:odd", $resultTable).addClass("greenbar");
    }


    function getColSpanIndex(thisTH) { //get index of TH, counting previous TH with colspans (does not look at prior rowspans)
        var thisColSpanIndex = 0,
            thisIndex = $(thisTH).index(),
            thisTR = $(thisTH).parent();

        $("th", thisTR).each(function(i) {
            if (i < thisIndex) {
                if ($(this).attr("colspan") > 0) {
                    thisColSpanIndex = thisColSpanIndex + Number($(this).attr("colspan"));
                } else {
                    thisColSpanIndex++;
                }
            }
        });

        return thisColSpanIndex;
    }


    function getColCount(tr) { ///get amount of columns in a given row, counting colspans
        var colCount = 0;
        var cells = $(tr).children();

        cells.each(function() {
            var extraColspan = Number($(this).attr("colspan")) - 1 || 0;
            colCount = colCount + 1 + extraColspan;
        });

        return colCount;
    }


    function getLongestRowLen(table) { //given a table, gets the length of the row with the most cells

        var mostCells = 0;
        $("tr", table).each(function() {
            var thisRowLen = $(this).children().length;
            if (thisRowLen > mostCells) {
                mostCells = thisRowLen;
            }
        });
        return mostCells;
    }


    function removeEmptyRows(rows) { //remove rows if they are empty
        $(rows).each(function() {
            if (!$(this).children().text().match(/\S/)) {
                $(this).remove();
            }
        });
    }



    function removeEmptyColumns(tableArea) { //remove rows if they are empty
        var rowsLen = $("tr", tableArea).length,
            tableColumnsLen = getLongestRowLen(tableArea.parent());

        for (var i = 0; i < tableColumnsLen; i++) {
            var foundText = false;

            for (var j = 0; j < rowsLen; j++) {
                var cell = $("tr:eq(" + j + ") th:eq(" + i + ")", tableArea);
                if (cell.text().match(/\S/)) {
                    foundText = true;
                    break;
                }

            }

            if (!foundText) {
                for (var j = 0; j < rowsLen; j++) {
                    var cell = $("tr:eq(" + j + ") th:eq(" + i + ")", tableArea);
                    cell.css("background-color", "yellow").addClass("selectedToRemove");
                }
            }

        }

        $(".selectedToRemove").remove();
    }
    
    function saveState() {
        TC.savedStatesArray.push($("#resultTableDiv").html());
        $("#undoButton").removeClass("disabled");
    }

    ///end general functions    


    ///keyboard inputs
    function KeyPress(e) {
        var evtobj = window.event ? event : e
        if ((evtobj.keyCode == 90 && evtobj.ctrlKey) || evtobj.metaKey && evtobj.keyCode == 90) { //ctrl or cmd z
            undo();
        };


    }


    $(window).keydown(function(e) {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            var char = (e.metaKey ? '⌘-' : '') + String.fromCharCode(e.keyCode)
            $('#keydown').append('<kbd>' + char + '</kbd>')
        }
    })


    document.onkeydown = KeyPress;


    function makeArrays(tableInputCode) { //calls individual array making functions

        var tableArray = makeOuterArray(tableInputCode);
        return tableArray; // an array ready to be start being put into html tags
    };


    function makeOuterArray(tableInputCode) { //makes first object of outer arrays (rows) by splitting new lines

        var outerArray = tableInputCode.split("\n").map(function(string) {
            var matchedSpaces = /^ +(?!I |II|III|IV)/.exec(string);

            !matchedSpaces ? matchedSpaces = "" : matchedSpaces = matchedSpaces[0];

            var matchedSpacesLen = matchedSpaces.length;

            var poundSigns = "";
            for (var i = 0; i < matchedSpacesLen; i++) {
                poundSigns = poundSigns + "#";
            }

            return string.rtrim().replace(matchedSpaces, poundSigns); //rtrim to remove last emty cell. Replace spaces with # filler so items will be indented in body THs, but not before I (in case of quarters, where that should end up in its own cell)



        });

        var dividedArray = outerArray.map(function(string) {
            return string.split(/(?=\s[A-Z])|\s{2,}|\t/); //split on a space before a capital letter, 2 spaces, or 1 tab
        });

        return dividedArray;
    };


    function makeHtmlTable(tableArray) {

        var htmlTable = "<table class = 'regular'>" + //Wrap all in table tags
            tableArray.map(function(row) { //add td tags to inner arrays, then tr tags to outer, then flatten as one html string
                return row.map(function(td) {
                    return "<td>" + td + "</td>";
                }).join("")
            }).map(function(row) {
                return "<tr>" + row + "</tr>";
            }).join("") + "</table>";

        return htmlTable;
    };



    function formatCaptionArea($resultTable) { //makes thead and caption
        //put in tHead area
        $resultTable.prepend("<thead></thead>");
        
        $("tbody tr:eq(0)", $resultTable).remove(); //remove old caption area
        $("<caption><span class='tableTitle'></span></caption>").insertBefore($("thead", $resultTable)); //get caption and insert it in thead area

    };


    function separateThead($resultTable) { //tries to find what rows belong in thead and tbody
        
        var isTHeadPlaced = false;
        var mostTDcount = getLongestRowLen($resultTable);
        var lastTDcount = 0;

        $("tbody tr", $resultTable).each(function() { //go through each row and find where the amount of TD cells is the most for 2 concurrent rows - that should find the begining of the tbody
            var thisRow = $(this);

            var thisTDcount = thisRow.children().length;
            var nextTDcount = thisRow.next().children().length;

            var prevRowText = thisRow.index() > 1 ? thisRow.prev().text() : "N/A";
            var nextRowText = thisRow.next().text();
            var thisRowText = thisRow.text();

            if (thisRowText.match(/-{3,}/) || //if cell is just "----"
                (prevRowText + thisRowText + nextRowText === "") || //if there are three empty rows
                (thisTDcount == lastTDcount && thisTDcount == nextTDcount && thisTDcount == mostTDcount)) { // , or if its count is the biggest, and it's the same as the last count and the next count, it's probably the begining of tbody     

                if (thisRowText.match(/-{3,}/)) {
                    var tBodyStartIndex = thisRow.index(); //this row
                } else {
                    var tBodyStartIndex = thisRow.index() - 1; //the row before this match
                }

                $("tr:lt(" + tBodyStartIndex + ")", $resultTable).appendTo("thead", $resultTable);
                isTHeadPlaced = true;
                return false;
            }

            lastTDcount = thisTDcount;
        });
        
        if($("thead tr", $resultTable).length < 1){ //if thead area wasn't found, get the first row for thead
            $("tr:eq(0)", $resultTable).appendTo("thead", $resultTable);
        }
        
    };



    function separateTfoot($resultTable) { //tries to find what rows belong in tfoot

        var mostTDcount = getLongestRowLen($resultTable);

        $("tbody tr", $resultTable).reverse().each(function() {
            var thisRow = $(this);
            var thisTDcount = thisRow.children().length;

            if (thisTDcount == mostTDcount) { //if its count is as large as the most, it probably the end of the body
                var tFootStartIndex = thisRow.index();

                $("<tfoot></tfoot>").appendTo($resultTable); //add empty tfoot area

                $("tbody tr:gt(" + tFootStartIndex + ")", $resultTable).addClass("footnotes").appendTo("tfoot", $resultTable).children().addClass("footnotes").wrapInner("<p></p>"); //put tfoot rows in tfoot area and add td an p tags to cells

                return false;
            }

        });
    };
    
    
    function styleFootnoteLinks($resultTable){ //replace (num) with superscript
        $resultTable.html($resultTable.html().replace(/(\(\d+\))/g,"<a href ='#footnotes'><sup>$1</sup></a>")); 
        $("tfoot td").each(function(){
           $(this).html($(this).html().replace(/(^\d+)/,"<sup>$1</sup>"));
        });
        
    }



    function mergeTbodyTHs($resultTable) {

        for (var rowIndex = $("tbody tr", $resultTable).length - 1; rowIndex > 0; rowIndex--) {
            var thisRow = $("tbody tr", $resultTable).eq(rowIndex);
            var thisTH = $("th:eq(0)", thisRow);
            var thisColSpan = Number(thisTH.attr("colspan")) || 1;

            if (thisColSpan < 2 && thisTH.next().length < 1) { //merge th cells vertically if they should be together as one row header


                var thisClass = $("p", thisTH).attr("class") || "";
                thisClass = thisClass.replace(".5", "");

                var thisText = thisTH.text();
                $("th:eq(0) p", thisRow.next()).prepend(thisText + " ").attr("class", thisClass);

                thisRow.remove();


            }

        }


    }



    function styleTbody($resultTable) { // style left cells as TH P, and add row classes for css coloring

        var mostTDcount = getLongestRowLen($resultTable);

        for (var rowIndex = 0; rowIndex < $("tbody tr", $resultTable).length; rowIndex++) {

            var thisRow = $("tbody tr", $resultTable).eq(rowIndex);
            var thisTD = $("td:eq(0)", thisRow);
            var thisText = thisTD.text();

            //if this row is empty, remove all but the first td and make it span entire table
            if (thisRow.text() == "") {
                $("td:gt(0)", thisRow).remove();
                thisTD.attr("colspan", mostTDcount);
            }


            if (thisText.match(/\-{4,}/)) { //if this is a standalone cell with just "----", remove it
                $(thisTD).remove();
            }

            var matchedPoundSigns = /^#+/.exec(thisText); //replace # fillers with sub classes;
            !matchedPoundSigns ? matchedPoundSigns = "" : matchedPoundSigns = matchedPoundSigns[0];
            var thisSubClass = "sub0";
            var subNum = (matchedPoundSigns.length / 2) > 10 ? 0 : matchedPoundSigns.length / 2;
            thisSubClass = "sub" + subNum;

            thisTD.html(thisText.replace(matchedPoundSigns, "").replace(/\.+$/, "")); //remove pound signs and extra periods at end
                        

            thisTD.wrapInner("<p class='" + thisSubClass + "'></p>").changeElementType("th", true); //change leftmost cells to TH P


            //left align td cells if they start with text
            $("td", thisRow).each(function() {
                if ($.trim($(this).text()).match(/^[A-Z]/i)) {
                    $(this).css("text-align", "left");
                }
            });
        }

        mergeTbodyTHs($resultTable); //merge th cells vertically if they should be together as one row header

        stripeRows($resultTable);

    };


    function styleTfoot($resultTable) { // format and style tfoot cells

        var newColSpan = getColCount($("tbody tr:last", $resultTable));
        var tFootArea = $("tfoot", $resultTable);

        $("tr", tFootArea).each(function() {

            var newFootnoteText = $("td", $(this)).map(function() { //join the text from all the foot trs, and remove # fillers
                return $(this).text().replace(/^#+|^-{2,}/, "") || "";
            }).get().join(" ");

            $(this).replaceWith("<tr><td colspan='" + newColSpan + "' style = 'border-top: 0px;' >" + newFootnoteText + "</td></tr>");

        });


        //add footnotes header
        $("<span class='footnotestitle' id ='footnotes'>Footnotes<br></span>").prependTo("tfoot tr:first td", $resultTable);

    };



    function reloadThead(tableInputCode, $resultTable, tableColumnsLen) { //reload the thead area with arrays still with pre spacing
        
        tableInputCode = tableInputCode.replace(/ (?! )/g, "_"); //separate words with _ (separate cells keep a space)
        var THeadRowsLen = $("thead tr", $resultTable).length + 1;

        var THeadArray = tableInputCode.split("\n").filter(function(n) {
            return n != "";
        }).splice(0, THeadRowsLen); //get thead arrays


        $.each(THeadArray, function(i) {

            if (i == 0) {
                $(".tableTitle", $resultTable).text(THeadArray[i].replace(/_+/g, " ")); //insert title text
            } else {
                $("thead tr:eq(" + (i - 1) + ")", $resultTable).html("<th>" + THeadArray[i] + "</th>"); //insert trow texts (with _ at begining)
            }
        });

    };



    function setUpSubCaptions($resultTable) { //look for subcaptions 
        $("thead tr", $resultTable).each(function() {
            var thisRow = $(this);

            var thisTH = $("th:eq(0)", thisRow);
            var thisText = thisTH.text().replace(/^ /,"");

            if (thisText.match(/^[a-z]+\S+$/)) { //if starts with a lowercase letter, add this to main title
                $(".tableTitle", $resultTable).append("  " + thisText.replace(/_/g, " "));
                thisRow.remove();            
                
            } else if (thisText.match(/^\S+$/)) { //if it is all non space from begining to end, probably a subtitle
                $("caption", $resultTable).append("<br>" + thisText.replace(/_/g, " "));
                thisRow.remove();
                
            } else {
                return false;  //if no match, don't keep looking in the other rows                       
            }
        });
    }


    function styleThead($resultTable, tableColumnsLen) { //try to line up and style thead

        var extractTxtLen = 10; //default extract length (remove this many spaces if no other value given)
        var spacesToRemoveRegEx = new RegExp("^ {0," + extractTxtLen + "}", "g");
        
        
        for (var i = 0; i < tableColumnsLen + 10; i++) { //some extra cells will be made at the end, to be removed later - gives it some breathing room

            $("thead tr", $resultTable).each(function(rowIndex) {
                var thisRow = $(this);

                var thisTH = $("th:last", thisRow);
                var thisText = thisTH.text();

                $("<th>&nbsp;</th>").insertBefore(thisTH); //insert empty row before each th - later matched text will move there

                if (!thisText.match(/^ /)) { //if it doesn't begin with a space (meaning not indented)

                    var wordsGroupRegEx = /(^\S+(?= ))|(^_.+$)/; //match word groups (groups are connected with _)
                    var extractText = wordsGroupRegEx.exec(thisText);

                    if (extractText) { //if text was extracted

                        extractText = extractText[0];

                        var halfTxt = extractText.split("_"); //if extract text is a duplicate word, make it just the first word
                        if (halfTxt[halfTxt.length - 1] === halfTxt[halfTxt.length - 2]) {
                            extractText = halfTxt[halfTxt.length - 2];
                        }

                        thisTH.text(thisText.replace(extractText, "")); //remove extract text from this cell
                        
                        $(thisTH.prev()).text(extractText); //place extract text in previous th

                    }
                }

                thisTH.text(thisTH.text().replace(spacesToRemoveRegEx, "")); //remove spaces at begining of each row
            });
        }; //end for loop


        $("thead th", $resultTable).each(function() { //remove leftover underscores with spaces
            $(this).text($(this).text().replace(/_/g, " "));
        });

        removeEmptyRows($("thead tr", $resultTable)); //pass the rows that should be removed
        removeEmptyColumns($("thead", $resultTable)); //pass the area that columns should be removed
        mergeWholeTHeadColumn(0, $resultTable); //merge first th in thead (pass column index)       

    }; //end styleThead()




    function mergeWholeTHeadColumn(thisColIndex, $resultTable) { //
        var THeadRows = $("thead tr", $resultTable);
        var rowsLen = THeadRows.length;

        var wholeText = ""; ///concat text from each th in column
        $(THeadRows).each(function() {
            $("th:eq(" + thisColIndex + ")", $(this)).each(function() {
                wholeText = wholeText + $(this).text() + " ";
            }).remove();
        });

        var newTH = "<th>" + $.trim(wholeText) + "</th>"; //make new th element with wholetext and long rowspan and append
        $(newTH).attr("rowspan", rowsLen).css("vertical-align", "top")
            .insertBefore($("thead tr:eq(0) th:eq(" + thisColIndex + ")", $resultTable));

    };




    //when two cells are selected decide the proper mod function (below) to call based on what modifyButton is selected

    function modifySelectedCells(appliedMod, addRowSpans) {
        var properties = {};

        properties.cell0 = $(".selected:eq(0)");

        properties.cell0Text = $.trim(properties.cell0.text());
        properties.cell0html = properties.cell0.html();
        properties.cell0RowSpan = Number(properties.cell0.attr("rowspan")) || 1;
        properties.cell0ColSpan = Number(properties.cell0.attr("colspan")) || 1;
        properties.cell0Class = properties.cell0.attr("class");
        properties.cell0Styles = properties.cell0.attr("style");


        properties.cell1 = $(".selected:eq(1)");

        properties.cell1Text = $.trim(properties.cell1.text());
        properties.cell1html = properties.cell1.html();
        properties.cell1RowSpan = Number(properties.cell1.attr("rowspan")) || 1;
        properties.cell1ColSpan = Number(properties.cell1.attr("colspan")) || 1;
        properties.cell1Class = properties.cell1.attr("class");
        properties.cell1Styles = properties.cell1.attr("style");

        switch (appliedMod) {
            case "swapCellsButton":
                {
                    swapSelectedCells(properties);
                    break;
                }

            case "mergeCellsButton":
                {
                    mergeSelectedCells(properties, addRowSpans);
                    break;
                }
        }
    }



    function swapSelectedCells(p) { //swaps text in selected cells

        p.cell0.text(p.cell1Text)
            .attr("rowspan", p.cell1RowSpan)
            .attr("colspan", p.cell1ColSpan)
            .attr("class", p.cell1Class)
            .attr("style", p.cell1Styles);


        p.cell1.text(p.cell0Text)
            .attr("rowspan", p.cell0RowSpan)
            .attr("colspan", p.cell0ColSpan)
            .attr("class", p.cell0Class)
            .attr("style", p.cell0Styles);

    }


    function mergeSelectedCells(p, addRowSpans) { //merges selected cells

        var middleSpace = " ";
        var foundEndHyphen = /-$/.exec(p.cell0Text);


        if (foundEndHyphen) {
            p.cell0Text = p.cell0Text.replace(/-$/, ""); //replace end hyphen
            middleSpace = "";
        }


        if (p.cell0.children().length > 0) { //if there's a p element in this, insert text in that, not the cell
            p.cell0.children().eq(0).text(p.cell0Text + " " + p.cell1Text);
       
        } else {
            p.cell0.text(p.cell0Text + middleSpace + p.cell1Text);
        }

        //figure out col and rowspans depending on horiz or vert verge
        if (p.cell0.parent().index() === p.cell1.parent().index()) { //merging horizontally
            p.cell0.attr("colspan", p.cell0ColSpan + p.cell1ColSpan);
        
        
        } else { //merging vertically

            if (addRowSpans) {
                p.cell0.attr("rowspan", p.cell0RowSpan + p.cell1RowSpan);
                p.cell0.css("vertical-align", "top");
            }

        }

        p.cell1.remove();

    }


    function insertCell(clickedCell) { //inserts a cell left of where clicked

        var newCell = document.createElement(clickedCell.nodeName);
        $(newCell).hide().insertBefore(clickedCell).fadeIn(300);
        bindTableCellsClick();
    }


    function removeCell(clickedCell) { //removes the clicked cell or row if this was the last cell

        if ($(clickedCell).parent().children().length < 2) {
            $(clickedCell).parent().fadeAway(function() {
                stripeRows($("#resultTableDiv table"));
            });

        } else {
            $(clickedCell).fadeAway();
        }
    }


    
    function indentCell(clickedCell, enabledButton){ //decrease or increase indent depending on which button is enabled
        var thisP = $("p", clickedCell);
        if(thisP){
            var currentSub = thisP.attr("class") || "sub0";
            var currentSubNum = Number(currentSub.replace("sub",""));
            
            var newSubNum = enabledButton == "indentButton" ? currentSubNum + 1 : currentSubNum - 1;
          
            thisP.attr("class", "sub"+newSubNum);
        }
    }
    
 
    
    
    function moveRows(clickedCell){ //moves tbody rows to thead when row is clicked and button enabled
        var clickedRow = $(clickedCell).parent();
        var clickedRowIndex = clickedRow.index();
        var clickedArea = clickedRow.parents("tbody");
        
        if(clickedArea[0]){ // clicked body - move to head
            $("tr:eq("+clickedRowIndex+"), tr:lt("+clickedRowIndex+")", clickedArea).children().changeElementType("th", false);
            $("tr:eq("+clickedRowIndex+"), tr:lt("+clickedRowIndex+")", clickedArea).appendTo(clickedArea.prev());

        }else{ //clicked head - move to body
            var clickedArea = clickedRow.parents("thead");
            $("tr:eq("+clickedRowIndex+"), tr:gt("+clickedRowIndex+")", clickedArea).each(function(){
                $("th:gt(0)", $(this)).changeElementType("td", false);
            });            
            
            $("tr:eq("+clickedRowIndex+"), tr:gt("+clickedRowIndex+")", clickedArea).prependTo(clickedArea.next());
            
        }
        
        bindTableCellsClick();
        stripeRows($("#resultTableDiv table"));
    }
    
    
    function undo() { //when undo button is clicked, load last saved state into chart results
        var lastSavedTable = TC.savedStatesArray.pop();
        
        if (TC.savedStatesArray.length < 1) {
            $("#undoButton").addClass("disabled");
        }
        
        $("#resultTableDiv").html(lastSavedTable);
        unselectCells();
        bindTableCellsClick();
        writeChartCode();
    }
    




    //set up when th cell is clicked when a modify button is on
    function bindTableCellsClick() {
        $("th, td").unbind();

        $("th, td").click(function() {
            var enabledButton = $(".modifyButton.enabled").attr("id");
            
            if (enabledButton == "swapCellsButton" || enabledButton == "mergeCellsButton") {
                
                $(this).hasClass("selected") ? $(this).removeClass("selected") : $(this).addClass("selected");

                if ($(".selected").length > 1) { //if one is already selected
                    modifySelectedCells(enabledButton, true); //button selected , add rowspans
                    unselectCells();
                    writeChartCode();
                }
                return false;
            }

            
            saveState();

            if (enabledButton == "editTextButton") {
                return false;
            }

            if (enabledButton == "insertCellButton") {
                insertCell(this);
            }

            if (enabledButton == "removeCellButton") {
                removeCell(this);
                writeChartCode();
            }
            
            if (enabledButton == "moveRowsButton"){
                moveRows(this);
            }
            
            if (enabledButton == "indentButton" || enabledButton == "decreaseIndentButton"){
                indentCell(this, enabledButton);
            }           
            
            
            writeChartCode();
        });
    }


    



    //set up cell modify buttons
    function modifyButtonsSetUp() {
        $(".modifyButton").click(function() {

            if ($(this).attr("id") == "undoButton") {
                undo();
                return false;
            }

            $(".modifyButton").removeClass("enabled");
            $(this).addClass("enabled");
            unselectCells();

            $(this).attr("id") == "editTextButton" ? $("#resultTableDiv").attr("contentEditable", "true") : $("#resultTableDiv").attr("contentEditable", "false"); // if it's the edit text button, enable text edit on the result div


        });
    }


    //set up convert button
    function convertButtonSetUp() {
        $("#convertButton").click(function() {
            saveState();
            var tableInputCode = $("#tableInputArea").val().replace(/_|\|/g, " "); //get value, clean a little -{2,}|
            var tableArray = makeArrays(tableInputCode); //make arrays  
            
            var htmlTable = makeHtmlTable(tableArray); //turn arrays into table tags 

            $("#resultTableDiv").html(htmlTable); ///place new table in visible div

            formatTableAreas(tableInputCode); //try to figure out what should go in thead, tbody, tfoot, then style


        });
    }


    function writeChartCode() {
        $("#tableCodeOutputArea").val($("#resultTableDiv").html());
    }


    //set up when leave table, update code and save state
    function tableBlurSetUp() {
        $("#resultTableDiv").blur(function() {
            writeChartCode();
        });
    }

        
 
    
    
    
    function formatTableAreas(tableInputCode) { //calls functions to try to figure out what should go in thead, tbody, tfoot, style, bind clicks, and write code

        var $resultTable = $("#resultTableDiv table");

        formatCaptionArea($resultTable); //makes thead and caption
        separateThead($resultTable); //tries to find what rows belong in thead
        separateTfoot($resultTable); //tries to find what rows belong in tfoot
        //removeEmptyRows($resultTable);
        styleTbody($resultTable); // style left cells as TH P, and add row classes for css coloring
        styleTfoot($resultTable); // format and style tfoot cells


        var tableColumnsLen = getLongestRowLen($resultTable);

        reloadThead(tableInputCode, $resultTable, tableColumnsLen); //reload the thead area from the array, now that we know which arrays it takes
        setUpSubCaptions($resultTable); //look for subcaptions 
        styleThead($resultTable, tableColumnsLen); //try to line up and style thead
        styleFootnoteLinks($resultTable);
        bindTableCellsClick(); //binds clicking on cells to modify those cells
        writeChartCode();
    };
    
    


    $(document).ready(function() {

        modifyButtonsSetUp(); //set up cell modify buttons
        convertButtonSetUp(); //set up convert button
        tableBlurSetUp();

    });

}(jQuery));