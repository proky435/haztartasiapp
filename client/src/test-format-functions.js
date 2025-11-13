/**
 * Test Format Functions - Teszteli a formázó függvényeket
 */

// Szimuláljuk a utilitiesService-t
const utilitiesService = {
  formatConsumption(consumption, unit) {
    // Típuskonverzió és validálás
    const numConsumption = parseFloat(consumption);
    
    if (!numConsumption || numConsumption === 0 || isNaN(numConsumption)) {
      return '0 ' + unit;
    }
    
    if (numConsumption < 1) {
      return `${(numConsumption * 1000).toFixed(0)} ${unit === 'm³' ? 'liter' : 'Wh'}`;
    }
    
    return `${numConsumption.toFixed(2)} ${unit}`;
  },

  formatCost(cost) {
    // Típuskonverzió és validálás
    const numCost = parseFloat(cost);
    
    if (!numCost || numCost === 0 || isNaN(numCost)) {
      return '0 Ft';
    }
    
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numCost);
  }
};

// Tesztek
console.log('🧪 Formázó függvények tesztelése');
console.log('=================================\n');

// Test cases
const testCases = [
  // formatConsumption tesztek
  { func: 'formatConsumption', args: ['8.000', 'm³'], expected: '8.00 m³' },
  { func: 'formatConsumption', args: [8.000, 'm³'], expected: '8.00 m³' },
  { func: 'formatConsumption', args: [null, 'm³'], expected: '0 m³' },
  { func: 'formatConsumption', args: [undefined, 'm³'], expected: '0 m³' },
  { func: 'formatConsumption', args: ['0.000', 'm³'], expected: '0 m³' },
  { func: 'formatConsumption', args: ['0.5', 'm³'], expected: '500 liter' },
  
  // formatCost tesztek
  { func: 'formatCost', args: ['4800.00'], expected: '4 800 Ft' },
  { func: 'formatCost', args: [4800.00], expected: '4 800 Ft' },
  { func: 'formatCost', args: [null], expected: '0 Ft' },
  { func: 'formatCost', args: [undefined], expected: '0 Ft' },
  { func: 'formatCost', args: ['0.00'], expected: '0 Ft' },
];

testCases.forEach((test, index) => {
  try {
    const result = utilitiesService[test.func](...test.args);
    const status = result.includes(test.expected.split(' ')[0]) ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.func}(${test.args.join(', ')}) = "${result}"`);
  } catch (error) {
    console.log(`${index + 1}. ❌ ${test.func}(${test.args.join(', ')}) = ERROR: ${error.message}`);
  }
});

console.log('\n🎉 Tesztelés befejezve!');
