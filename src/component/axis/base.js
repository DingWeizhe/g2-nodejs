const Util = require('../../util');
const { LabelsRenderer } = require('../label/index');
const { Group } = require('@ali/g');
const Grid = require('./grid');

class Base extends Group {
  getDefaultCfg() {
    return {
      zIndex: 4,
      /**
       * �������ϵ������
       * @type {Array}
       */
      ticks: null,
      /**
       * �������ߵ�ͼ���������ã�������ó�null������ʾ
       * @type {Object}
       */
      line: null,
      /**
       * �̶��ߵ���ʽ���ã�������ó�null������ʾ
       * @type {Object}
       */
      tickLine: null,
      /**
       * �ο̶��߸��������δ���ø����ԣ�����ʾ
       * @type {Number}
       */
      subTickCount: 0,
      /**
       * �ο̶�����ʽ����
       * @type {Object}
       */
      subTickLine: null,
      /**
       * ������դ������ʽ���ã��������Ϊ null������ʾ
       * @type {Object}
       */
      grid: null,
      /**
       * �������ϵ��ı��������
       * @type {Object}
       */
      label: {
        textStyle: {}, // �ı���ʽ����
        autoRotate: true,
        formatter: null//  ��ʽ���������ı���ʾ
        // offset: 10 // �ı������������ߵľ��룬��Ӧԭ���� labelOffset
      },
      /**
       * �����������ʽ����
       * @type {Object}
       */
      title: {
        autoRotate: true, // �Զ���ת
        textStyle: {} // �����ı���ʽ����
        // offset: 20 // �������������ߵľ���
      },
      autoPaint: true, // @type {Boolean} �Ƿ��Զ�����
      _labelOffset: 10, // @type {Number} ����������ľ���
      _titleOffset: 20 // @type {Number} ��������������λ��
      // formatter: null, // @type {Function} ��ʽ���������ϵĽڵ�
      // firstTick: true // @type {Boolean} �Ƿ���ʾ��һ����ע
    };
  }

  _renderUI() {
    const labelCfg = this.get('label');
    if (labelCfg) {
      this.renderLabels();
    }
    if (this.get('autoPaint')) {
      this.paint();
    }
    if (!Util.isNil(this.get('title'))) {
      this.renderTitle();
    }
    this.sort();
  }

  _parseTicks(ticks) {
    ticks = ticks || [];
    const ticksLength = ticks.length;
    for (let i = 0; i < ticksLength; i++) {
      const item = ticks[i];
      if (!Util.isObject(item)) {
        ticks[i] = this.parseTick(item, i, ticksLength);
      }
    }
    this.set('ticks', ticks);
    return ticks;
  }

  _addTickItem(index, point, length, type = '') {
    let tickItems = this.get('tickItems');
    let subTickItems = this.get('subTickItems');
    const end = this.getTickEnd(point, length, index);

    const cfg = {
      x1: point.x,
      y1: point.y,
      x2: end.x,
      y2: end.y
    };

    if (!tickItems) {
      tickItems = [];
    }

    if (!subTickItems) {
      subTickItems = [];
    }

    if (type === 'sub') {
      subTickItems.push(cfg);
    } else {
      tickItems.push(cfg);
    }

    this.set('tickItems', tickItems);
    this.set('subTickItems', subTickItems);
  }

  // TODO: rename
  _formatPoint(value) {
    const label = this.get('label');
    if (label && label.formatter) {
      value = label.formatter.call(this, value);
    }

    return value;
  }

  _renderLine() {
    let lineCfg = this.get('line');
    let path;
    if (lineCfg) {
      path = this.getLinePath();
      lineCfg = Util.mix({
        path
      }, lineCfg);
      const lineShape = this.addShape('path', {
        attrs: lineCfg
      });
      lineShape.name = 'axis-line';
      this.set('lineShape', lineShape);
    }
  }

  _processTicks() {
    const self = this;
    const labelCfg = self.get('label');
    const subTickCount = self.get('subTickCount');
    const tickLineCfg = self.get('tickLine');
    let ticks = self.get('ticks');
    ticks = self._parseTicks(ticks);

    Util.each(ticks, function(tick, index) {
      const tickPoint = self.getTickPoint(tick.value, index);
      if (tickLineCfg) {
        self._addTickItem(index, tickPoint, tickLineCfg.length);
      }
      if (labelCfg) {
        self.addLabel(self._formatPoint(tick.text), tickPoint, index, tick.value);
      }
    });

    if (subTickCount) { // ��������ôμ��ֵ㣬���Ӵμ�tick
      const subTickLineCfg = self.get('subTickLine');
      Util.each(ticks, function(tick, index) {
        let diff = index ? tick.value - ticks[index - 1].value : tick.value;
        diff = diff / self.get('subTickCount');

        for (let i = 1; i < subTickCount; i++) {
          const subTick = {
            text: '',
            value: index ? ticks[index - 1].value + i * diff : i * diff
          };

          const tickPoint = self.getTickPoint(subTick.value);
          let subTickLength;
          if (subTickLineCfg && subTickLineCfg.length) {
            subTickLength = subTickLineCfg.length;
          } else {
            subTickLength = parseInt(tickLineCfg.length * (3 / 5), 10);
          }
          self._addTickItem(i - 1, tickPoint, subTickLength, 'sub');
        }
      });
    }
  }

  _addTickLine(ticks, lineCfg) {
    const self = this;
    const cfg = Util.mix({}, lineCfg);
    const path = [];
    Util.each(ticks, function(item) {
      path.push([ 'M', item.x1, item.y1 ]);
      path.push([ 'L', item.x2, item.y2 ]);
    });
    delete cfg.length;
    cfg.path = path;
    const tickShape = self.addShape('path', {
      attrs: cfg
    });
    tickShape.name = 'axis-ticks';
  }

  _renderTicks() {
    const self = this;
    const tickItems = self.get('tickItems');
    const subTickItems = self.get('subTickItems');

    if (tickItems) {
      const tickLineCfg = self.get('tickLine');
      self._addTickLine(tickItems, tickLineCfg);
    }

    if (subTickItems) {
      const subTickLineCfg = self.get('subTickLine') || self.get('tickLine');
      self._addTickLine(subTickItems, subTickLineCfg);
    }
  }

  _renderGrid() {
    const grid = this.get('grid');
    if (!grid) {
      return;
    }

    if (this.get('start')) {
      grid.start = this.get('start');
    }

    this.set('gridGroup', this.addGroup(Grid, grid));
  }

  paint() {
    this._renderLine();
    this._processTicks();
    this._renderTicks();
    this._renderGrid();
    const labelCfg = this.get('label');
    if (labelCfg && labelCfg.autoRotate) {
      this.autoRotateLabels();
    }
  }

  parseTick(tick, index, length) {
    return {
      text: tick,
      value: index / (length - 1)
    };
  }

  getTextAnchor(vector) {
    const ratio = Math.abs(vector.y / vector.x);
    let align;
    if (ratio >= 1) { // �����������
      align = 'center';
    } else {
      if (vector.x > 0) { // �Ҳ�
        align = 'left';
      } else { // ���
        align = 'right';
      }
    }
    return align;
  }

  getMaxLabelWidth(labelsGroup) {
    const labels = labelsGroup.get('children');
    let max = 0;
    Util.each(labels, function(label) {
      const bbox = label.getBBox();
      const width = bbox.width;
      if (max < width) {
        max = width;
      }
    });
    return max;
  }

  remove() {
    super.remove();
    const gridGroup = this.get('gridGroup');
    gridGroup && gridGroup.remove();
    this.removeLabels();
  }

  /**
   * ��ת�ı�
   * @abstract
   * @return {[type]} [description]
   */
  autoRotateLabels() {}

  /**
   * ��Ⱦ���������
   * @abstract
   * @return {[type]} [description]
   */
  renderTitle() {}

  /**
   * ��ȡ�������ߵ� path
   * @abstract
   * @return {[type]} [description]
   */
  getLinePath() {}

  /**
   * ��ȡtick�ڻ����ϵ�λ��
   * @abstract
   * @return {[type]} [description]
   */
  getTickPoint() {}

  /**
   * ��ȡ��ʾ�������ߵ��յ�
   * @abstract
   * @return {[type]} [description]
   */
  getTickEnd() {}

  /**
   * ��ȡ���������������
   * @abstract
   * @return {[type]} [description]
   */
  getSideVector() {}
}

Util.assign(Base.prototype, LabelsRenderer, {
  addLabel(value, point, index) {
    const labelsGroup = this.get('labelsGroup');
    const label = {};
    let rst;

    if (labelsGroup) {
      const offset = this.get('label').offset || this.get('_labelOffset');
      const vector = this.getSideVector(offset, point, index);
      point = {
        x: point.x + vector[0],
        y: point.y + vector[1]
      };

      label.text = value;
      label.x = point.x;
      label.y = point.y;
      label.textAlign = this.getTextAnchor(vector);
      rst = labelsGroup.addLabel(label);
    }
    return rst;
  }
});

module.exports = Base;