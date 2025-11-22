const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

/**
 * Teszt adatok feltöltése proky2003@gmail.com felhasználóhoz
 * - Inventory items fogyasztási adatokkal
 * - Shopping list history
 * - Consumption tracking példák
 */

async function seedTestData() {
  try {
    console.log('🌱 Teszt Adatok Feltöltése\n');
    
    await connectDatabase();
    console.log('✅ Adatbázis kapcsolat OK\n');
    
    // 1. Keressük meg a felhasználót
    console.log('👤 Felhasználó keresése: proky2003@gmail.com');
    const userResult = await query(`
      SELECT id, name FROM users WHERE email = 'proky2003@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Felhasználó nem található!');
      console.log('   Először regisztrálj a proky2003@gmail.com címmel az alkalmazásban.\n');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Felhasználó megtalálva: ${user.name} (${user.id})\n`);
    
    // 2. Keressük meg a háztartást
    console.log('🏠 Háztartás keresése...');
    const householdResult = await query(`
      SELECT h.id, h.name 
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
      LIMIT 1
    `, [user.id]);
    
    if (householdResult.rows.length === 0) {
      console.log('❌ Nincs háztartás!');
      console.log('   Először hozz létre egy háztartást az alkalmazásban.\n');
      process.exit(1);
    }
    
    const household = householdResult.rows[0];
    console.log(`✅ Háztartás: ${household.name} (${household.id})\n`);
    
    // 3. Termékek létrehozása/lekérése
    console.log('📦 Termékek létrehozása...');
    
    const products = [
      { name: 'Tej', barcode: '5998200210015', category: 'Tejtermékek', unit: 'liter' },
      { name: 'Kenyér', barcode: '5998200310016', category: 'Pékáruk', unit: 'db' },
      { name: 'Tojás', barcode: '5998200410017', category: 'Tejtermékek', unit: 'db' },
      { name: 'Cukor', barcode: '5998200510018', category: 'Alapanyagok', unit: 'kg' },
      { name: 'Liszt', barcode: '5998200610019', category: 'Alapanyagok', unit: 'kg' }
    ];
    
    const productIds = [];
    
    for (const prod of products) {
      const result = await query(`
        INSERT INTO products_master (barcode, name, category)
        VALUES ($1, $2, $3)
        ON CONFLICT (barcode) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [prod.barcode, prod.name, prod.category]);
      
      productIds.push({ ...prod, id: result.rows[0].id });
      console.log(`  ✅ ${prod.name}`);
    }
    console.log('');
    
    // 4. Inventory items hozzáadása fogyasztási előzményekkel
    console.log('📊 Inventory items + fogyasztási előzmények...');
    
    const now = new Date();
    
    // Először töröljük a meglévő inventory item-eket és a kapcsolódó changes-t
    // Trigger kikapcsolása
    await query(`ALTER TABLE household_inventory DISABLE TRIGGER inventory_audit_trigger`);
    
    await query(`
      DELETE FROM inventory_changes 
      WHERE household_inventory_id IN (
        SELECT id FROM household_inventory WHERE household_id = $1
      )
    `, [household.id]);
    
    await query(`
      DELETE FROM household_inventory 
      WHERE household_id = $1
    `, [household.id]);
    
    // Trigger visszakapcsolása
    await query(`ALTER TABLE household_inventory ENABLE TRIGGER inventory_audit_trigger`);
    
    console.log('  🗑️  Meglévő inventory törölve');
    
    // Tej - 2 doboz jelenlegi készlet (1 doboz = 1 liter)
    const tejProduct = productIds.find(p => p.name === 'Tej');
    const tejInventory = await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, quantity, unit,
        expiry_date, purchase_date, added_by_user_id,
        last_quantity_change, created_at, updated_at
      ) VALUES ($1, $2, $3, 2, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      household.id,
      tejProduct.id,
      'Tej (1L doboz)', // custom_name hozzáadva
      'doboz',
      new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 nap múlva jár le
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 napja vettük
      user.id,
      new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 órája változott
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 12 * 60 * 60 * 1000)
    ]);
    
    // Fogyasztási előzmények a tejhez - dobozokban (3 naponta 1 doboz)
    const tejChanges = [
      { from: 5, to: 4, days_ago: 15 },  // 1 doboz elfogyott
      { from: 4, to: 3, days_ago: 12 },  // 1 doboz elfogyott
      { from: 3, to: 2, days_ago: 9 },   // 1 doboz elfogyott
      { from: 2, to: 1, days_ago: 6 },   // 1 doboz elfogyott
      { from: 1, to: 0, days_ago: 3 }    // 1 doboz elfogyott (utána újra vásároltunk)
    ];
    
    for (const change of tejChanges) {
      const changeDate = new Date(now.getTime() - change.days_ago * 24 * 60 * 60 * 1000);
      await query(`
        INSERT INTO inventory_changes (
          household_inventory_id, user_id, change_type,
          old_quantity, new_quantity, quantity_change,
          reason, created_at
        ) VALUES ($1, $2, 'consume', $3, $4, $5, $6, $7)
      `, [
        tejInventory.rows[0].id,
        user.id,
        change.from,
        change.to,
        change.to - change.from,
        'Fogyasztás',
        changeDate
      ]);
    }
    console.log('  ✅ Tej (2 doboz) + 5 fogyasztási adat → 3 naponta 1 doboz');
    
    // Kenyér - 1 db jelenlegi készlet
    const kenyerProduct = productIds.find(p => p.name === 'Kenyér');
    const kenyerInventory = await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, quantity, unit,
        expiry_date, purchase_date, added_by_user_id,
        last_quantity_change, created_at, updated_at
      ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      household.id,
      kenyerProduct.id,
      'Kenyér', // custom_name hozzáadva
      'db',
      new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      user.id,
      new Date(now.getTime() - 6 * 60 * 60 * 1000),
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 6 * 60 * 60 * 1000)
    ]);
    
    // Kenyér fogyasztási előzmények - 2 naponta 1 db
    const kenyerChanges = [
      { from: 4, to: 3, days_ago: 8 },   // 1 db elfogyott
      { from: 3, to: 2, days_ago: 6 },   // 1 db elfogyott
      { from: 2, to: 1, days_ago: 4 },   // 1 db elfogyott
      { from: 1, to: 0, days_ago: 2 }    // 1 db elfogyott (utána újra vásároltunk)
    ];
    
    for (const change of kenyerChanges) {
      const changeDate = new Date(now.getTime() - change.days_ago * 24 * 60 * 60 * 1000);
      await query(`
        INSERT INTO inventory_changes (
          household_inventory_id, user_id, change_type,
          old_quantity, new_quantity, quantity_change,
          reason, created_at
        ) VALUES ($1, $2, 'consume', $3, $4, $5, $6, $7)
      `, [
        kenyerInventory.rows[0].id,
        user.id,
        change.from,
        change.to,
        change.to - change.from,
        'Fogyasztás',
        changeDate
      ]);
    }
    console.log('  ✅ Kenyér (1 db) + 4 fogyasztási adat → 2 naponta 1 db');
    
    // Tojás - jelenlegi készlet
    const tojasProduct = productIds.find(p => p.name === 'Tojás');
    await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, quantity, unit,
        expiry_date, purchase_date, added_by_user_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, 6, $4, $5, $6, $7, $8, $9)
    `, [
      household.id,
      tojasProduct.id,
      'Tojás', // custom_name hozzáadva
      'db',
      new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      user.id,
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    ]);
    console.log('  ✅ Tojás (6 db)');
    
    // Vaj - gyorsan fogyó termék (biztosan lesz javaslat) - csomagokban
    const vajProduct = await query(`
      INSERT INTO products_master (barcode, name, category)
      VALUES ('5998200810021', 'Vaj (250g csomag)', 'Tejtermékek')
      ON CONFLICT (barcode) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    
    const vajInventory = await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, quantity, unit,
        expiry_date, purchase_date, added_by_user_id,
        last_quantity_change, created_at, updated_at
      ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      household.id,
      vajProduct.rows[0].id,
      'Vaj (250g csomag)',
      'csomag',
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      user.id,
      new Date(now.getTime() - 6 * 60 * 60 * 1000),
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 6 * 60 * 60 * 1000)
    ]);
    
    // Vaj fogyasztási előzmények - 3 naponta 1 csomag
    const vajChanges = [
      { from: 4, to: 3, days_ago: 12 },  // 1 csomag elfogyott
      { from: 3, to: 2, days_ago: 9 },   // 1 csomag elfogyott
      { from: 2, to: 1, days_ago: 6 },   // 1 csomag elfogyott
      { from: 1, to: 0, days_ago: 3 }    // 1 csomag elfogyott (utána újra vásároltunk)
    ];
    
    for (const change of vajChanges) {
      const changeDate = new Date(now.getTime() - change.days_ago * 24 * 60 * 60 * 1000);
      await query(`
        INSERT INTO inventory_changes (
          household_inventory_id, user_id, change_type,
          old_quantity, new_quantity, quantity_change,
          reason, created_at
        ) VALUES ($1, $2, 'consume', $3, $4, $5, $6, $7)
      `, [
        vajInventory.rows[0].id,
        user.id,
        change.from,
        change.to,
        change.to - change.from,
        'Fogyasztás',
        changeDate
      ]);
    }
    console.log('  ✅ Vaj (1 csomag) + 4 fogyasztási adat → 3 naponta 1 csomag');
    
    console.log('');
    
    // 5. Shopping list history
    console.log('🛒 Shopping list history...');
    
    // Tej vásárlási előzmények (hétfői mintázat)
    const tejHistory = [
      { weeks_ago: 4, day: 1 }, // 4 hete hétfőn
      { weeks_ago: 3, day: 1 }, // 3 hete hétfőn
      { weeks_ago: 2, day: 1 }, // 2 hete hétfőn
      { weeks_ago: 1, day: 1 }  // 1 hete hétfőn
    ];
    
    for (const hist of tejHistory) {
      const addedDate = new Date(now.getTime() - hist.weeks_ago * 7 * 24 * 60 * 60 * 1000);
      addedDate.setHours(20, 0, 0, 0); // Este 8-kor
      
      const completedDate = new Date(addedDate.getTime() + 24 * 60 * 60 * 1000); // Másnap
      
      await query(`
        INSERT INTO shopping_list_item_history (
          household_id, product_master_id, 
          added_to_list_date, completed_date,
          quantity, unit, source, added_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        household.id,
        tejProduct.id,
        addedDate,
        completedDate,
        2,
        'liter',
        'manual',
        user.id
      ]);
    }
    console.log('  ✅ Tej - 4 vásárlási előzmény (hétfői mintázat)');
    
    // Kenyér vásárlási előzmények (szerdai mintázat)
    const kenyerHistory = [
      { weeks_ago: 3, day: 3 },
      { weeks_ago: 2, day: 3 },
      { weeks_ago: 1, day: 3 }
    ];
    
    for (const hist of kenyerHistory) {
      const addedDate = new Date(now.getTime() - hist.weeks_ago * 7 * 24 * 60 * 60 * 1000);
      addedDate.setHours(19, 0, 0, 0);
      
      const completedDate = new Date(addedDate.getTime() + 12 * 60 * 60 * 1000);
      
      await query(`
        INSERT INTO shopping_list_item_history (
          household_id, product_master_id,
          added_to_list_date, completed_date,
          quantity, unit, source, added_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        household.id,
        kenyerProduct.id,
        addedDate,
        completedDate,
        1,
        'db',
        'manual',
        user.id
      ]);
    }
    console.log('  ✅ Kenyér - 3 vásárlási előzmény (szerdai mintázat)');
    
    console.log('');
    
    // 6. Aktuális bevásárlólista tételek hozzáadása
    console.log('🛒 Aktuális bevásárlólista tételek...');
    
    // Keressük meg az alapértelmezett bevásárlólistát
    const defaultListResult = await query(`
      SELECT id FROM shopping_lists
      WHERE household_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [household.id]);
    
    let shoppingListId;
    if (defaultListResult.rows.length === 0) {
      // Hozzunk létre egy alapértelmezett listát
      const newListResult = await query(`
        INSERT INTO shopping_lists (
          household_id, name, status, created_by_user_id
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [household.id, 'Bevásárlólista', 'active', user.id]);
      shoppingListId = newListResult.rows[0].id;
      console.log('  ✅ Új bevásárlólista létrehozva');
    } else {
      shoppingListId = defaultListResult.rows[0].id;
      console.log('  ✅ Meglévő bevásárlólista használata');
    }
    
    // Töröljük a meglévő tételeket
    await query(`
      DELETE FROM shopping_list_items
      WHERE shopping_list_id = $1
    `, [shoppingListId]);
    
    // Cukor hozzáadása (nincs készleten)
    const cukorProduct = productIds.find(p => p.name === 'Cukor');
    await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, product_master_id, custom_name,
        quantity, unit, purchased
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [shoppingListId, cukorProduct.id, 'Cukor', 1, 'kg', false]);
    console.log('  ✅ Cukor hozzáadva a listához');
    
    // Liszt hozzáadása (nincs készleten)
    const lisztProduct = productIds.find(p => p.name === 'Liszt');
    await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, product_master_id, custom_name,
        quantity, unit, purchased
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [shoppingListId, lisztProduct.id, 'Liszt', 1, 'kg', false]);
    console.log('  ✅ Liszt hozzáadva a listához');
    
    // Alma hozzáadása (custom termék)
    await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, custom_name,
        quantity, unit, purchased
      ) VALUES ($1, $2, $3, $4, $5)
    `, [shoppingListId, 'Alma', 2, 'kg', false]);
    console.log('  ✅ Alma hozzáadva a listához (custom)');
    
    console.log('');
    
    // 7. Lejárt termék példa (pazarlás statisztika)
    console.log('🗑️  Pazarlás példa...');
    
    const joghurtProduct = await query(`
      INSERT INTO products_master (barcode, name, category)
      VALUES ('5998200710020', 'Joghurt', 'Tejtermékek')
      ON CONFLICT (barcode) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    
    const expiredInventory = await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, quantity, unit,
        expiry_date, purchase_date, added_by_user_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      household.id,
      joghurtProduct.rows[0].id,
      'Joghurt', // custom_name hozzáadva
      'db',
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 napja lejárt
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      user.id,
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    ]);
    
    await query(`
      INSERT INTO inventory_changes (
        household_inventory_id, user_id, change_type,
        old_quantity, new_quantity, quantity_change,
        reason, created_at
      ) VALUES ($1, $2, 'expire', 2, 0, -2, $3, $4)
    `, [
      expiredInventory.rows[0].id,
      user.id,
      'Lejárt termék eltávolítása',
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    ]);
    
    console.log('  ✅ Joghurt - lejárt termék (pazarlás)\n');
    
    // Összefoglaló
    console.log('='.repeat(60));
    console.log('✅ Teszt Adatok Sikeresen Feltöltve!\n');
    console.log('📊 Statisztikák:');
    console.log('  - Tej: 5 fogyasztási adat → 3 naponta 1 doboz (egész egység!)');
    console.log('  - Kenyér: 4 fogyasztási adat → 2 naponta 1 db (egész egység!)');
    console.log('  - Vaj: 4 fogyasztási adat → 3 naponta 1 csomag (egész egység!)');
    console.log('  - Tej vásárlás: 4x hétfőn → mintázat felismerhető');
    console.log('  - Kenyér vásárlás: 3x szerdán → mintázat felismerhető');
    console.log('  - Pazarlás: 1 lejárt termék');
    console.log('  - Bevásárlólista: 3 tétel (Cukor, Liszt, Alma)\n');
    console.log('🎯 Most már tesztelheted:');
    console.log('  1. Settings oldal → tracking beállítások');
    console.log('  2. Inventory → Tej (2 doboz), Kenyér (1 db), Tojás (6 db), Vaj (1 csomag)');
    console.log('  3. Shopping List → 3 tétel + 💡 Javaslatok');
    console.log('  4. Statistics → pazarlás statisztika\n');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedTestData();
