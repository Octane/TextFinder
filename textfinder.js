"use strict";

/**
 * TextFinder v1.0 – поиск текста в DOM-дереве без учета количества пробелов между словами.
 *
 * © Дмитрий Коробкин <dmitry.korobkin@gmail.com>, 2014
 * Лицензия MIT
 * https://github.com/Octane/TextFinder/
 */

new function () {

	/**
	 * @constructor
	 * @param {HTMLElement} rootContainer Элемент, внутри которого будет выполнен поиск.
	 */
	function TextFinder(rootContainer) {
		this.collectTextNodes(rootContainer);
	}

	TextFinder.prototype = {

		constructor: TextFinder,

		/**
		 * Информация о текстовых узлах внутри rootContainer.
		 * @type Array
		 */
		textNodes: [
			{
				/**
				 * Ссылка на текстовый узел.
				 * @type Text
				 */
				node: null,
				/**
				 * Индекс последнего символа относительно всего текста + 1.
				 * @type Number
				 */
				characterInterval: -1
			}
		],

		/**
		 * Индекс nodeType текстовых узлов.
		 * @const
		 * @type Number
		 */
		TEXT_NODE: 3,

		/**
		 * Экранирует символы в строке так, чтобы из неё можно было создать шаблон регулярного выражения.
		 * @param {String} str Исходная строка.
		 * @type String
		 * @returns Строка с экранированными символами.
		 */
		escape: function (str) {
			return str.replace(/([?!^$.(){}:|=[\]+\-\/\\*])/g, "\\$1");
		},

		/**
		 * Создает шаблон регулярного выражения так, чтобы во время поиска не учитывалось количество пробелов между словами.
		 * @param {String} text Исходная строка.
		 * @type String
		 * @returns Шаблон регулярного выражения.
		 */
		createSearchPattern: function (text) {
			//В некоторых браузерах неразрывный пробел (&nbsp; или \u00A0) не попадает под область действия метасимвола \s.
			//todo проработать все непечатные символы http://perfectionkills.com/whitespace-deviations/
			return this.escape(text).replace(/^[\s\u0A00]+|[\s\u0A00]+$/, "").split(/[\s\u0A00]+/).join("[\\s\\u00A0]+");
		},

		/**
		 * Рекурсивно обходит фрагмент DOM-дерева и собирает информацию о текстовых узлах.
		 * @param {HTMLElement} rootContainer Элемент, внутри которого будет выполнен поиск.
		 */
		collectTextNodes: function (rootContainer, returnValue) {

			var TEXT_NODE = this.TEXT_NODE, textNodes = [], j = 0, str = "";

			function collect(element) {
				var node, nodes = element.childNodes, length = nodes.length, i = -1;
				while (++i < length) {
					node = nodes[i];
					if (node.nodeType == TEXT_NODE && node.nodeValue) {
						str += node.nodeValue;
						textNodes[j++] = {
							node: node,
							characterInterval: str.length
						};
					} else if(node.hasChildNodes() && node.offsetWidth) {//todo visible node
						collect(node);//рекурсия
					}
				}
			}

			collect(rootContainer);

			if (returnValue) {
				return {
					text: str,
					textNodes: textNodes
				};
			}

			this.text = str;
			this.textNodes = textNodes;
		},

		/**
		 * Выполняет поиск.
		 * @param {String} searchText Искомый текст.
		 * @param {Boolean} caseSensitive Искать с учетом регистра.
		 * @type Array
		 * @returns Массив объектов с информацией для работы с Range.
		 */
		find: function (searchText, caseSensitive) {
			var ranges = [], reFlags = caseSensitive ? "g" : "gi",
				regexp = new RegExp(this.createSearchPattern(searchText), reFlags),
				lastMatch = regexp.exec(this.text), length;
			while (lastMatch) {
				length = lastMatch[0].length;
				ranges.push(this.computeRange(regexp.lastIndex - length, regexp.lastIndex));
				regexp.lastIndex -= length - 1;
				lastMatch = regexp.exec(this.text);
			}
			return ranges;
		},

		/**
		 * Вычисляет startContainer, endContainer, startOffset и endOffset для Range.
		 * @param {Number} start Индекс символа, с которого начинается найденный текст, относительно всего текста.
		 * @param {Number} end Индекс символа, на котором заканчивается найденный текст, относительно всего текста.
		 * @type Object
		 * @returns Объект, содержащий вышеперечисленные свойства.
		 */
		computeRange: function (start, end) {
			var startContainer = this.getInfo(start), endContainer = this.getInfo(end - 1);
			return {
				startContainer: startContainer.node,
				endContainer: endContainer.node,
				startOffset: start - startContainer.characterInterval + startContainer.node.nodeValue.length,
				endOffset: end - endContainer.characterInterval + endContainer.node.nodeValue.length
			};
		},

		/**
		 * Определяет текстовый узел по индексу символа.
		 * @param {Number} characterIndex Индекс символа относительно всего текста.
		 * @type Object
		 * @returns Объект с информацией о текстовом узле.
		 */
		getInfo: function (characterIndex) {
			for (var i = 0; i < this.textNodes.length; i++) {
				if (this.textNodes[i].characterInterval > characterIndex) {
					return this.textNodes[i];
				}
			}
			return null;
		}

	};

	/**
	 * Выделяет текст на странице.
	 * @param {HTMLElement|TextNode} params.startContainer Узел, с которого начинается выделение текста.
	 * @param {HTMLElement|TextNode} params.endContainer Узел, в котором заканчивается выделение текста.
	 * @param {Number} params.startOffset Смещение выделения от начала startContainer.
	 * @param {Number} params.endOffset Смещение выделения от начала endContainer.
	 * @returns Range
	 */
	TextFinder.highlight = function highlight(params) {
		var selection = getSelection(),
			range = document.createRange(),
			startContainer = params.startContainer,
			viewPoint = startContainer;
		if (viewPoint.nodeType == 3) {
			viewPoint = viewPoint.parentNode;
		}
		viewPoint.scrollIntoView();
		range.setStart(startContainer, params.startOffset);
		range.setEnd(params.endContainer, params.endOffset);
		selection.removeAllRanges();
		selection.addRange(range);
		return range;
	};

	window.TextFinder = TextFinder;

};
