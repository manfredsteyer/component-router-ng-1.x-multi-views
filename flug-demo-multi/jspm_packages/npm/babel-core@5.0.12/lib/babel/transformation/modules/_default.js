/* */ 
"format global";
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var messages = _interopRequireWildcard(require("../../messages"));

var traverse = _interopRequire(require("../../traversal"));

var extend = _interopRequire(require("lodash/object/extend"));

var object = _interopRequire(require("../../helpers/object"));

var util = _interopRequireWildcard(require("../../util"));

var t = _interopRequireWildcard(require("../../types"));

var remapVisitor = {
  enter: function enter(node, parent, scope, formatter) {
    var remap = formatter.internalRemap[node.name];
    if (this.isReferencedIdentifier() && remap) {
      if (!scope.hasBinding(node.name) || scope.bindingIdentifierEquals(node.name, formatter.localImports[node.name])) {
        return remap;
      }
    }

    if (t.isUpdateExpression(node)) {
      var exported = formatter.getExport(node.argument, scope);

      if (exported) {
        this.skip();

        // expand to long file assignment expression
        var assign = t.assignmentExpression(node.operator[0] + "=", node.argument, t.literal(1));

        // remap this assignment expression
        var remapped = formatter.remapExportAssignment(assign, exported);

        // we don't need to change the result
        if (t.isExpressionStatement(parent) || node.prefix) {
          return remapped;
        }

        var nodes = [];
        nodes.push(remapped);

        var operator;
        if (node.operator === "--") {
          operator = "+";
        } else {
          // "++"
          operator = "-";
        }
        nodes.push(t.binaryExpression(operator, node.argument, t.literal(1)));

        return t.sequenceExpression(nodes);
      }
    }

    if (node._skipModulesRemap) {
      return this.skip();
    }

    if (t.isAssignmentExpression(node) && !node._ignoreModulesRemap) {
      var exported = formatter.getExport(node.left, scope);
      if (exported) {
        this.skip();
        return formatter.remapExportAssignment(node, exported);
      }
    }
  }
};

var importsVisitor = {
  ImportDeclaration: {
    enter: function enter(node, parent, scope, formatter) {
      formatter.hasLocalImports = true;
      extend(formatter.localImports, this.getBindingIdentifiers());
    }
  }
};

var exportsVisitor = traverse.explode({
  ExportDeclaration: {
    enter: function enter(node, parent, scope, formatter) {
      formatter.hasLocalExports = true;

      var declar = this.get("declaration");
      if (declar.isStatement()) {
        var bindings = declar.getBindingIdentifiers();
        for (var name in bindings) {
          var binding = bindings[name];
          formatter._addExport(name, binding);
        }
      }

      if (this.isExportNamedDeclaration() && node.specifiers) {
        for (var i = 0; i < node.specifiers.length; i++) {
          var specifier = node.specifiers[i];
          var local = specifier.local;
          if (!local) continue;

          formatter._addExport(local.name, specifier.exported);
        }
      }

      if (!t.isExportDefaultDeclaration(node)) {
        var onlyDefault = node.specifiers && node.specifiers.length === 1 && t.isSpecifierDefault(node.specifiers[0]);
        if (!onlyDefault) {
          formatter.hasNonDefaultExports = true;
        }
      }
    }
  }
});

var DefaultFormatter = (function () {
  function DefaultFormatter(file) {
    _classCallCheck(this, DefaultFormatter);

    this.internalRemap = object();
    this.defaultIds = object();
    this.scope = file.scope;
    this.file = file;
    this.ids = object();

    this.hasNonDefaultExports = false;

    this.hasLocalExports = false;
    this.hasLocalImports = false;

    this.localExports = object();
    this.localImports = object();

    this.getLocalExports();
    this.getLocalImports();
  }

  DefaultFormatter.prototype.transform = function transform() {
    this.remapAssignments();
  };

  DefaultFormatter.prototype.doDefaultExportInterop = function doDefaultExportInterop(node) {
    return (t.isExportDefaultDeclaration(node) || t.isSpecifierDefault(node)) && !this.noInteropRequireExport && !this.hasNonDefaultExports;
  };

  DefaultFormatter.prototype.getLocalExports = function getLocalExports() {
    this.file.path.traverse(exportsVisitor, this);
  };

  DefaultFormatter.prototype.getLocalImports = function getLocalImports() {
    this.file.path.traverse(importsVisitor, this);
  };

  DefaultFormatter.prototype.remapAssignments = function remapAssignments() {
    if (this.hasLocalExports || this.hasLocalImports) {
      this.file.path.traverse(remapVisitor, this);
    }
  };

  DefaultFormatter.prototype.remapExportAssignment = function remapExportAssignment(node, exported) {
    var assign = node;

    for (var i = 0; i < exported.length; i++) {
      assign = t.assignmentExpression("=", t.memberExpression(t.identifier("exports"), exported[i]), assign);
    }

    return assign;
  };

  DefaultFormatter.prototype._addExport = function _addExport(name, exported) {
    var _localExports, _name;

    var info = (_localExports = this.localExports, _name = name, !_localExports[_name] && (_localExports[_name] = {
      binding: this.scope.getBindingIdentifier(name),
      exported: []
    }), _localExports[_name]);
    info.exported.push(exported);
  };

  DefaultFormatter.prototype.getExport = function getExport(node, scope) {
    if (!t.isIdentifier(node)) return;

    var local = this.localExports[node.name];
    if (local && local.binding === scope.getBindingIdentifier(node.name)) {
      return local.exported;
    }
  };

  DefaultFormatter.prototype.getModuleName = function getModuleName() {
    var opts = this.file.opts;
    if (opts.moduleId) return opts.moduleId;

    var filenameRelative = opts.filenameRelative;
    var moduleName = "";

    if (opts.moduleRoot) {
      moduleName = opts.moduleRoot + "/";
    }

    if (!opts.filenameRelative) {
      return moduleName + opts.filename.replace(/^\//, "");
    }

    if (opts.sourceRoot) {
      // remove sourceRoot from filename
      var sourceRootRegEx = new RegExp("^" + opts.sourceRoot + "/?");
      filenameRelative = filenameRelative.replace(sourceRootRegEx, "");
    }

    if (!opts.keepModuleIdExtensions) {
      // remove extension
      filenameRelative = filenameRelative.replace(/\.(\w*?)$/, "");
    }

    moduleName += filenameRelative;

    // normalize path separators
    moduleName = moduleName.replace(/\\/g, "/");

    return moduleName;
  };

  DefaultFormatter.prototype._pushStatement = function _pushStatement(ref, nodes) {
    if (t.isClass(ref) || t.isFunction(ref)) {
      if (ref.id) {
        nodes.push(t.toStatement(ref));
        ref = ref.id;
      }
    }

    return ref;
  };

  DefaultFormatter.prototype._hoistExport = function _hoistExport(declar, assign, priority) {
    if (t.isFunctionDeclaration(declar)) {
      assign._blockHoist = priority || 2;
    }

    return assign;
  };

  DefaultFormatter.prototype.getExternalReference = function getExternalReference(node, nodes) {
    var ids = this.ids;
    var id = node.source.value;

    if (ids[id]) {
      return ids[id];
    } else {
      return this.ids[id] = this._getExternalReference(node, nodes);
    }
  };

  DefaultFormatter.prototype.checkExportIdentifier = function checkExportIdentifier(node) {
    if (t.isIdentifier(node, { name: "__esModule" })) {
      throw this.file.errorWithNode(node, messages.get("modulesIllegalExportName", node.name));
    }
  };

  DefaultFormatter.prototype.exportAllDeclaration = function exportAllDeclaration(node, nodes) {
    var ref = this.getExternalReference(node, nodes);
    nodes.push(this.buildExportsWildcard(ref, node));
  };

  DefaultFormatter.prototype.isLoose = function isLoose() {
    return this.file.isLoose("es6.modules");
  };

  DefaultFormatter.prototype.exportSpecifier = function exportSpecifier(specifier, node, nodes) {
    if (node.source) {
      var ref = this.getExternalReference(node, nodes);

      if (specifier.local.name === "default" && !this.noInteropRequireExport) {
        // importing a default so we need to normalize it
        ref = t.callExpression(this.file.addHelper("interop-require"), [ref]);
      } else {
        ref = t.memberExpression(ref, specifier.local);

        if (!this.isLoose()) {
          nodes.push(this.buildExportsFromAssignment(specifier.exported, ref, node));
          return;
        }
      }

      // export { foo } from "test";
      nodes.push(this.buildExportsAssignment(specifier.exported, ref, node));
    } else {
      // export { foo };
      nodes.push(this.buildExportsAssignment(specifier.exported, specifier.local, node));
    }
  };

  DefaultFormatter.prototype.buildExportsWildcard = function buildExportsWildcard(objectIdentifier) {
    return t.expressionStatement(t.callExpression(this.file.addHelper("defaults"), [t.identifier("exports"), t.callExpression(this.file.addHelper("interop-require-wildcard"), [objectIdentifier])]));
  };

  DefaultFormatter.prototype.buildExportsFromAssignment = function buildExportsFromAssignment(id, init) {
    this.checkExportIdentifier(id);
    return util.template("exports-from-assign", {
      INIT: init,
      ID: t.literal(id.name)
    }, true);
  };

  DefaultFormatter.prototype.buildExportsAssignment = function buildExportsAssignment(id, init) {
    this.checkExportIdentifier(id);
    return util.template("exports-assign", {
      VALUE: init,
      KEY: id
    }, true);
  };

  DefaultFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    var declar = node.declaration;

    var id = declar.id;

    if (t.isExportDefaultDeclaration(node)) {
      id = t.identifier("default");
    }

    var assign;

    if (t.isVariableDeclaration(declar)) {
      for (var i = 0; i < declar.declarations.length; i++) {
        var decl = declar.declarations[i];

        decl.init = this.buildExportsAssignment(decl.id, decl.init, node).expression;

        var newDeclar = t.variableDeclaration(declar.kind, [decl]);
        if (i === 0) t.inherits(newDeclar, declar);
        nodes.push(newDeclar);
      }
    } else {
      var ref = declar;

      if (t.isFunctionDeclaration(declar) || t.isClassDeclaration(declar)) {
        ref = declar.id;
        nodes.push(declar);
      }

      assign = this.buildExportsAssignment(id, ref, node);

      nodes.push(assign);

      this._hoistExport(declar, assign);
    }
  };

  return DefaultFormatter;
})();

module.exports = DefaultFormatter;