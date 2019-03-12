'use strict';

import * as vscode from 'vscode';
import { TextEdit, Position, Range } from 'vscode';

export function activate(context: vscode.ExtensionContext) {

   vscode.languages.registerDocumentRangeFormattingEditProvider('plsql', {

      provideDocumentRangeFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
         var line: string;
         var tabSize = "";
         var docSize: number = vscode.window.activeTextEditor.selection.end.line;
         var currentSelection = vscode.window.activeTextEditor.selection;
         var changedLine: string = "";
         var tabSizeMarker: string;
         var tabSelect: tabWhen;
         tabSelect = new tabWhen(tabSize, false, "", false, false);
         for (var i = vscode.window.activeTextEditor.selection.start.line; i <= docSize; i++) {
            line = vscode.window.activeTextEditor.document.lineAt(i).text;
            if (i < docSize) {
               tabSelect.nextLine = vscode.window.activeTextEditor.document.lineAt(i + 1).text;
            }
            tabSelect = checkEnd(line, tabSelect);

            changedLine = changedLine + tabSelect.tabSize + line.trimLeft();

            if (i != docSize) {
               changedLine = changedLine + "\n";
            }

            tabSelect = checkProc(line, tabSelect);

            tabSelect = checkStart(line, tabSelect);

            tabSelect = checkSelect(line, tabSelect);
         }
         return [TextEdit.replace(fullDocumentRange(document, currentSelection), changedLine)];
      }
   });
}


function fullDocumentRange(document: vscode.TextDocument, selection: vscode.Selection): Range {

   const startLineId = selection.start.line;
   const lastLineId = selection.end.line;

   return new Range(startLineId, 0, lastLineId, document.lineAt(lastLineId).text.length);

}

function checkEnd(line: string, tabObj: tabWhen): tabWhen {
   // if (!checkKeyWordValid(line, "--")) {
   if ((!checkKeyWordValid(line, "\\.") && !tabObj.whenFlag && checkKeyWordValid(line, "\\)\\;")) || checkKeyWordValid(line, "end;")) {
      if (!tabObj.whenFlag || tabObj.typeFlag) {
         tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 2);
      }
      else {
         tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 5);
         tabObj.whenFlag = false;
      }
   }
   if (checkKeyWordValid(line, "end if") || checkKeyWordValid(line, "end") && checkKeyWordValid(line, "loop") || checkKeyWordValid(line, "elsif") || checkKeyWordValid(line, "else")) {
      tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 3);
   }
   // }
   return tabObj;
}

function checkStart(line: string, tabObj: tabWhen): tabWhen {
   var doubleSpace = "  ";
   var trippleSpace = "   ";
   // if (!checkKeyWordValid(line, "--")) {
   if (checkKeyWordValid(line, "begin") || (checkKeyWordValid(line, "\\(") && !checkKeyWordValid(line, "record") && !checkKeyWordValid(line, "then") && !checkKeyWordValid(line, "[a-zA-Z]*\\(") && !checkKeyWordValid(line, "\\.") && !checkKeyWordValid(line, "\\,") && !tabObj.procFlag)) {
      tabObj.tabSize = tabObj.tabSize + doubleSpace;
   }
   if (checkKeyWordValid(line, "type") && checkKeyWordValid(line, "record")) {
      tabObj.typeFlag = true;
      tabObj.tabSize = doubleSpace;
   }
   /* !checkKeyWordValid(line, "when") &&*/
   if (checkKeyWordValid(line, "then") || (checkKeyWordValid(line, "for") && checkKeyWordValid(line, "loop")) || checkKeyWordValid(line, "else") ) {
      tabObj.tabSize = tabObj.tabSize + trippleSpace;
   }
   // }
   return tabObj;
}

function checkSelect(line: string, tabObj: tabWhen): tabWhen {
   var doubleSpace = "  ";
   // if (!checkKeyWordValid(line, "--")) {
   if (checkKeyWordValid(line, "select") || checkKeyWordValid(line, "delete")) {
      tabObj.tabSize = tabObj.tabSize + doubleSpace;
   }
   if (checkKeyWordValid(line, "from")) {
      tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 1);
   }
   if (checkKeyWordValid(line, "where")) {
      if (!checkKeyWordValid(line, "\\;")) {
         tabObj.tabSize = tabObj.tabSize + doubleSpace;
      }
      else {
         tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 3);
      }
   }
   if (checkKeyWordValid(line, "and") && checkKeyWordValid(line, '\\;')) {
      if (!checkKeyWordValid(tabObj.nextLine, "exception")) {
         tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 3);
      }
      else {
         tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 5);
      }
   }
   if (checkKeyWordValid(line, "exception")) {
      tabObj.tabSize = tabObj.tabSize + doubleSpace;
   }
   if (checkKeyWordValid(line, "when")) {
      // tabObj.tabSize = tabObj.tabSize + doubleSpace;
      tabObj.whenFlag = true;
   }
   if (tabObj.whenFlag && tabObj.nextLine.toLowerCase().trimLeft().startsWith("when")) {
      tabObj.tabSize = tabObj.tabSize.substr(0, tabObj.tabSize.length - 3);
      tabObj.whenFlag = false;
   }
   // }
   return tabObj;
}

function checkProc(line: string, tabObj: tabWhen): tabWhen {
   var singleSpace = " ";
   var doubleSpace = "  ";
   // if (!checkKeyWordValid(line, "--")) {
   if (checkKeyWordValid(line, "procedure") && !checkKeyWordValid(line, "\;")) {
      for (var i = 0; i <= line.indexOf("\\("); i++) {
         tabObj.tabSize = tabObj.tabSize + singleSpace;
      }
      tabObj.procFlag = true;
   }
   if (checkKeyWordValid(line, "type") && !checkKeyWordValid(line, "\\%")) {
      tabObj.tabSize = tabObj.tabSize + doubleSpace;
      tabObj.typeFlag = true;
   }
   if ((checkKeyWordValid(line, "\\)") || checkKeyWordValid(line, "\\;")) && tabObj.procFlag) {
      tabObj.tabSize = "";
      tabObj.procFlag = false;
   }
   if (checkKeyWordValid(line, "is") && !checkKeyWordValid(line, "bis") && !checkKeyWordValid(line, "type") && !checkKeyWordValid(line, "not")) {
      tabObj.tabSize = tabObj.tabSize + doubleSpace;
   }
   // }
   return tabObj;
}

/**
 Checks if the given keyword is valid in this line
 - Valid means that it doesn not appear after a comment mark or in a string (parameter, etc)
 Only if the keyword is valid, use it in the above methods 
 */
function checkKeyWordValid(line: string, keyword: string): boolean {
   var comment = line.search("--");
   var matchWord: string;
   if (keyword.includes(".") || keyword.includes(";") || keyword === "\(" || keyword.includes(")")) {
      matchWord = keyword;
   } else {
      matchWord = "\\b" + keyword.toLowerCase() + "\\b";
   }
   var tempLine = line.replace(new RegExp("(\'.*\')"), "");
   if (comment > 0) {
      tempLine = tempLine.substr(0, comment);
   }
   
   return new RegExp(matchWord).exec(tempLine.toLowerCase()) !== null;
}

class tabWhen {
   tabSize: string = "";
   whenFlag: boolean;
   nextLine: string;
   procFlag: boolean;
   typeFlag: boolean;

   constructor(tabSize: string, whenFlag: boolean, nextLine: string, procFlag: boolean, typeFlag: boolean) {
      this.tabSize = tabSize;
      this.whenFlag = whenFlag;
      this.nextLine = nextLine;
      this.procFlag = procFlag;
      this.typeFlag = typeFlag;
   }
}