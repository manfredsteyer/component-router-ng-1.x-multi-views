/* */ 
"format global";
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var DefaultFormatter = _interopRequire(require("./_default"));

var includes = _interopRequire(require("lodash/collection/includes"));

var util = _interopRequireWildcard(require("../../util"));

var t = _interopRequireWildcard(require("../../types"));

var CommonJSFormatter = (function (_DefaultFormatter) {
  function CommonJSFormatter() {
    _classCallCheck(this, CommonJSFormatter);

    if (_DefaultFormatter != null) {
      _DefaultFormatter.apply(this, arguments);
    }
  }

  _inherits(CommonJSFormatter, _DefaultFormatter);

  CommonJSFormatter.prototype.init = function init() {
    this._init(this.hasLocalExports);
  };

  CommonJSFormatter.prototype._init = function _init(conditional) {
    var file = this.file;
    var scope = file.scope;

    scope.rename("module");
    scope.rename("exports");

    if (!this.noInteropRequireImport && conditional) {
      var templateName = "exports-module-declaration";
      if (this.file.isLoose("es6.modules")) templateName += "-loose";
      var declar = util.template(templateName, true);
      declar._blockHoist = 3;
      file.ast.program.body.unshift(declar);
    }
  };

  CommonJSFormatter.prototype.transform = function transform(program) {
    DefaultFormatter.prototype.transform.apply(this, arguments);

    if (this.hasDefaultOnlyExport) {
      program.body.push(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.identifier("module"), t.identifier("exports")), t.memberExpression(t.identifier("exports"), t.identifier("default")))));
    }
  };

  CommonJSFormatter.prototype.importSpecifier = function importSpecifier(specifier, node, nodes) {
    var variableName = specifier.local;

    var ref = this.getExternalReference(node, nodes);

    // import foo from "foo";
    if (t.isSpecifierDefault(specifier)) {
      if (includes(this.file.dynamicImportedNoDefault, node)) {
        this.internalRemap[variableName.name] = ref;
      } else {
        if (this.noInteropRequireImport) {
          this.internalRemap[variableName.name] = t.memberExpression(ref, t.identifier("default"));
        } else if (!includes(this.file.dynamicImported, node)) {
          var uid = this.scope.generateUidBasedOnNode(node, "import");

          nodes.push(t.variableDeclaration("var", [t.variableDeclarator(uid, t.callExpression(this.file.addHelper("interop-require-wildcard"), [ref]))]));

          this.internalRemap[variableName.name] = t.memberExpression(uid, t.identifier("default"));
        }
      }
    } else {
      if (t.isImportNamespaceSpecifier(specifier)) {
        if (!this.noInteropRequireImport) {
          ref = t.callExpression(this.file.addHelper("interop-require-wildcard"), [ref]);
        }

        // import * as bar from "foo";
        nodes.push(t.variableDeclaration("var", [t.variableDeclarator(variableName, ref)]));
      } else {
        // import { foo } from "foo";
        this.internalRemap[variableName.name] = t.memberExpression(ref, specifier.imported);
      }
    }
  };

  CommonJSFormatter.prototype.importDeclaration = function importDeclaration(node, nodes) {
    // import "foo";
    nodes.push(util.template("require", {
      MODULE_NAME: node.source
    }, true));
  };

  CommonJSFormatter.prototype.exportSpecifier = function exportSpecifier(specifier, node, nodes) {
    if (this.doDefaultExportInterop(specifier)) {
      this.hasDefaultOnlyExport = true;
    }

    DefaultFormatter.prototype.exportSpecifier.apply(this, arguments);
  };

  CommonJSFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    if (this.doDefaultExportInterop(node)) {
      this.hasDefaultOnlyExport = true;
    }

    DefaultFormatter.prototype.exportDeclaration.apply(this, arguments);
  };

  CommonJSFormatter.prototype._getExternalReference = function _getExternalReference(node, nodes) {
    var source = node.source.value;

    var call = t.callExpression(t.identifier("require"), [node.source]);
    var uid;

    if (includes(this.file.dynamicImported, node) && !includes(this.file.dynamicImportedNoDefault, node)) {
      call = t.memberExpression(call, t.identifier("default"));
      uid = node.specifiers[0].local;
    } else {
      uid = this.scope.generateUidBasedOnNode(node, "import");
    }

    var declar = t.variableDeclaration("var", [t.variableDeclarator(uid, call)]);
    nodes.push(declar);
    return uid;
  };

  return CommonJSFormatter;
})(DefaultFormatter);

module.exports = CommonJSFormatter;