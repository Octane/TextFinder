/**
 * TextFinder v1.0 – поиск текста в DOM-дереве
 * без учета количества пробелов между словами.
 *
 * © Дмитрий Коробкин, 2014
 * Лицензия MIT
 * github.com/Octane/TextFinder
 */
new function () {'use strict';

    /**
     * @constructor
     * @param {HTMLElement} rootContainer - Элемент, внутри которого
     *                                      будет выполнен поиск.
     */
    function TextFinder(rootContainer) {
        this.collectTextNodes(rootContainer);
    }

    TextFinder.prototype = {

        constructor: TextFinder,

        /**
         * Информация о текстовых узлах внутри rootContainer.
         * @type {Array}
         */
        textNodes: [
            {
                /**
                 * Ссылка на текстовый узел.
                 * @type {Text}
                 */
                node: null,

                /**
                 * Индекс последнего символа относительно всего текста + 1.
                 * @type {number}
                 */
                characterInterval: -1
            }
        ],

        /**
         * Экранирует символы в строке так, чтобы из неё можно было
         * создать шаблон регулярного выражения.
         * @param {string} str - Исходная строка.
         * @returns {string} Строка с экранированными символами.
         */
        escape: function (str) {
            return str.replace(/([?!^$.(){}:|=[\]+\-\/\\*])/g, '\\$1');
        },

        /**
         * Создает шаблон регулярного выражения так, чтобы во время поиска
         * не учитывалось количество пробелов между словами.
         * @param {string} text - Исходная строка.
         * @returns {string} Шаблон регулярного выражения.
         */
        createSearchPattern: function (text) {
            //В некоторых браузерах неразрывный пробел (&nbsp; или \u00A0)
            //не попадает под область действия метасимвола \s.
            //todo проработать все непечатные символы
            //perfectionkills.com/whitespace-deviations
            return this.escape(text).replace(/^[\s\u0A00]+|[\s\u0A00]+$/, '').
                   split(/[\s\u0A00]+/).join('[\\s\\u00A0]+');
        },

        /**
         * Рекурсивно обходит фрагмент DOM-дерева
         * и собирает информацию о текстовых узлах.
         * @param {HTMLElement} rootContainer - Элемент, внутри которого будет
         *                                      выполнен поиск.
         */
        collectTextNodes: function (rootContainer) {

            var textNodes = [],
                str = '';

            function collect(element) {
                var value,
                    node,
                    nodes = element.childNodes,
                    length = nodes.length,
                    i = 0;
                while (i < length) {
                    node = nodes[i];
                    if (node.nodeType == node.TEXT_NODE) {
                        value = node.nodeValue;
                        if (value) {
                            str += value;
                            textNodes.push({
                                node: node,
                                characterInterval: str.length
                            });
                        }
                    } else if(node.hasChildNodes() && node.offsetWidth) {
                        //todo node.offsetWidth → isVisible(node)
                        collect(node);//рекурсия
                    }
                    i++;
                }
            }

            collect(rootContainer);

            this.text = str;
            this.textNodes = textNodes;

        },

        /**
         * Выполняет поиск.
         * @param {string} searchText - Искомый текст.
         * @param {boolean} [caseSensitive] - Искать с учетом регистра.
         * @returns {Array} Массив объектов с информацией для работы с Range.
         */
        find: function (searchText, caseSensitive) {
            var ranges = [],
                flags = caseSensitive ? 'g' : 'gi',
                regexp = new RegExp(this.createSearchPattern(searchText), flags),
                lastMatch = regexp.exec(this.text),
                lastIndex,
                length;
            while (lastMatch) {
                length = lastMatch[0].length;
                lastIndex = regexp.lastIndex;
                ranges.push(this.computeRange(lastIndex - length, lastIndex));
                regexp.lastIndex -= length - 1;
                lastMatch = regexp.exec(this.text);
            }
            return ranges;
        },

        /**
         * Вычисляет startContainer, endContainer,
         * startOffset и endOffset для Range.
         * @param {number} start - Индекс символа, с которого начинается
         *                         найденный текст, относительно всего текста.
         * @param {number} end   - Индекс символа, на котором заканчивается
         *                         найденный текст, относительно всего текста.
         * @returns {Object} Объект, содержащий вышеперечисленные свойства.
         */
        computeRange: function (start, end) {
            var startContainer = this.getInfo(start),
                endContainer = this.getInfo(end - 1),
                startNode = startContainer.node,
                endNode = endContainer.node;
            return {
                startContainer: startNode,
                endContainer: endNode,
                startOffset: start - startContainer.characterInterval +
                             startNode.nodeValue.length,
                endOffset: end - endContainer.characterInterval +
                           endNode.nodeValue.length
            };
        },

        /**
         * Определяет текстовый узел по индексу символа.
         * @param {number} characterIndex  - Индекс символа относительно
         *                                   всего текста.
         * @returns {Object|null} Объект с информацией о текстовом узле.
         */
        getInfo: function (characterIndex) {
            var nodes = this.textNodes,
                node,
                length = nodes.length,
                i = 0;
            while (i < length) {
                node = nodes[i];
                if (node.characterInterval > characterIndex) {
                    return node;
                }
                i++;
            }
            return null;
        }

    };

    /**
     * Выделяет текст на странице.
     * @param {HTMLElement|Text} params.startContainer - Узел, с которого
     *                           начинается выделение текста.
     * @param {HTMLElement|Text} params.endContainer - Узел, в котором
     *                           заканчивается выделение текста.
     * @param {number} params.startOffset - Смещение выделения
     *                                      от начала startContainer.
     * @param {number} params.endOffset   - Смещение выделения
     *                                      от начала endContainer.
     * @returns {Range}
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
