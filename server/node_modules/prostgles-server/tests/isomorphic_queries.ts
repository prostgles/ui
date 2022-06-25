import { strict as assert } from 'assert';

import { DBHandlerServer} from "../dist/Prostgles";
import { DBHandlerClient } from "./client/index";
import * as fs from "fs";

export async function tryRun(desc: string, func: () => any, log?: Function){
  try {
    await func();
  } catch(err) {
    console.error(desc + " FAILED:");
    log?.("FAIL: ", err);
    setTimeout(() => {
      throw err;

    }, 2000)
  }
}
export function tryRunP(desc: string, func: (resolve: any, reject: any) => any, log?: Function){
  return new Promise(async (rv, rj) => {
    try {
      await func(rv, rj);
    } catch(err: any){
      log?.(`${desc} failed: ` + JSON.stringify(err));
      setTimeout(() => {
        throw err;
      }, 1000)
    }
  });
}

export default async function isomorphic(db: Partial<DBHandlerServer> | Partial<DBHandlerClient>) {
  console.log("Starting isomorphic queries");

  if(await db.items.count()){
    console.log("DELETING items");
    
    /* Access controlled */
    await db.items4.delete({ });

    await db.items4_pub.delete({ });
    await db.items3.delete({ });
    await db.items2.delete({ });
    await db.items.delete({ });
  
  }
  
  
  await tryRun("Prepare data", async () => {
    await db.items.insert([{ name: "a" }, { name: "a" }, { name: "b" }]);
    console.log(await db.items.find())
    await db.items2.insert([{ name: "a", items_id: 1 }]);
    await db.items3.insert([{ name: "a" }, { name: "za123" }]);
    await db.items4.insert([
      { name: "abc1", public: "public data", added: new Date('04 Dec 1995 00:12:00 GMT') },
      { name: "abc2", public: "public data", added: new Date('04 Dec 1995 00:12:00 GMT') },
      { name: "abcd", public: "public data d", added: new Date('04 Dec 1996 00:12:00 GMT') }
    ]);
    
    /* Ensure */
    await db["*"].insert([{ "*": "a" }, { "*": "a" }, { "*": "b" }]);
    await db[`"*"`].insert([{ [`"*"`]: "a" }, { [`"*"`]: "a" }, { [`"*"`]: "b" }]);

    await db.various.insert([
      { name: "abc9",  added: new Date('04 Dec 1995 00:12:00 GMT'), jsn: { "a": { "b": 2 } }  },
      { name: "abc1",  added: new Date('04 Dec 1996 00:12:00 GMT'), jsn: { "a": { "b": 3 } }  },
      { name: "abc81 here", added: new Date('04 Dec 1997 00:12:00 GMT'), jsn: { "a": { "b": 2 } }  }
    ])

    // console.log(await db["*"].find())
  });

  await tryRun("getColumns definition", async () => {
    const res = await db.tr2.getColumns("fr");
    // console.log(JSON.stringify(res, null, 2))
    const expected =  [
        {
          "label": "Id",
          "name": "id",
          "data_type": "integer",
          "udt_name": "int4",
          "element_type": null,
          "element_udt_name": null,
          "is_pkey": true,
          "column_default": null,
          "comment": null,
          "ordinal_position": 1,
          "is_nullable": false,
          "references": null,
          "has_default": true,
          "tsDataType": "number",
          "insert": true,
          "select": true,
          "filter": true,
          "update": true,
          "delete": true
        },
        {
          "label": "Tr1 id",
          "name": "tr1_id",
          "data_type": "integer",
          "udt_name": "int4",
          "element_type": null,
          "element_udt_name": null,
          "is_pkey": false,
          "column_default": null,
          "comment": null,
          "ordinal_position": 2,
          "is_nullable": true,
          "references": {
            "ftable": "tr1",
            "fcols": [
              "id"
            ],
            "cols": [
              "tr1_id"
            ]
          },
          "has_default": false,
          "tsDataType": "number",
          "insert": true,
          "select": true,
          "filter": true,
          "update": true,
          "delete": true
        },
        {
          "label": "fr_t1",
          hint: "hint...",
          min: "a", 
          max: "b",
          "name": "t1",
          "data_type": "text",
          "udt_name": "text",
          "element_type": null,
          "element_udt_name": null,
          "is_pkey": false,
          "column_default": null,
          "comment": null,
          "ordinal_position": 3,
          "is_nullable": true,
          "references": null,
          "has_default": false,
          "tsDataType": "string",
          "insert": true,
          "select": true,
          "filter": true,
          "update": true,
          "delete": true
        },
        {
          "label": "en_t2",
          "name": "t2",
          "data_type": "text",
          "udt_name": "text",
          "element_type": null,
          "element_udt_name": null,
          "is_pkey": false,
          "column_default": null,
          "comment": null,
          "ordinal_position": 4,
          "is_nullable": true,
          "references": null,
          "has_default": false,
          "tsDataType": "string",
          "insert": true,
          "select": true,
          "filter": true,
          "update": true,
          "delete": true
        }
      ];

    assert.deepStrictEqual(
      res, 
      expected
    );

    const resDynamic = await db.tr2.getColumns("fr", { rule: "update", filter: {}, data: { t2: "a" } });
    assert.deepStrictEqual(
      resDynamic, 
      expected
    );
  });

  await tryRun("$unnest_words", async () => {
    const res = await db.various.find({}, { returnType: "values", select: { name: "$unnest_words" } });

    assert.deepStrictEqual( res,  [
      'abc9',
      'abc1',
      'abc81',
      'here'
    ]);
  })

  /**
   * Group by/Distinct
   */
  await tryRun("Group by/Distinct", async () => {
    const res = await db.items.find({}, { select: { name: 1 }, groupBy: true });
    const resV = await db.items.find({}, { select: { name: 1 }, groupBy: true, returnType: "values" });
    
    assert.deepStrictEqual(
      res,
      [
        { name: 'a' },
        { name: 'b' },
      ]
    );
    assert.deepStrictEqual(
      resV,
      ["a", "b"]
    );
  })

  /**
   * returnType "value"
   */
  await tryRun("returnType: value", async () => {
    const resVl = await db.items.find({}, { select: { name: { $array_agg: ["name"] } }, returnType: "value" });
    
    assert.deepStrictEqual(
      resVl,
      ["a", "a", "b"]
    );

  })

  // add getInfo and getCols tests
  // console.log(await db.items.getInfo(), await db.items.getColumns())

  /**
   * TODO -> ADD ALL FILTER TYPES
   */   
  await tryRun("FTS filtering", async () => {
    const res = await db.various.count({ "tsv.@@.to_tsquery": ["a"] });
    assert.equal(res, 0);


    const d = await db.various.findOne(
      { "name.@@.to_tsquery": ["abc81"] }, 
      { select: { 
        h: { "$ts_headline_simple": ["name", { plainto_tsquery: "abc81" }] },
        hh: { "$ts_headline": ["name", "abc81"] } ,
        added: "$date_trunc_2hour",
        addedY: { "$date_trunc_5minute": ["added"] }
      }});
    // console.log(d);
    await db.various.findOne(
      { }, 
      { select: { 
        h: { "$ts_headline_simple": ["name", { plainto_tsquery: "abc81" }] },
        hh: { "$ts_headline": ["name", "abc81"] } ,
        added: "$date_trunc_2hour",
        addedY: { "$date_trunc_5millisecond": ["added"] }
      }});
      
    /* Dates become strings after reaching client.
    * Serialize col dataTypes and then recast ??
    */
    assert.deepStrictEqual(JSON.parse(JSON.stringify(d)), {
      h: '<b>abc81</b> here',
      hh: '<b>abc81</b> here',
      added: '1997-12-04T00:00:00.000Z',
      addedY: '1997-12-04T00:10:00.000Z',
      // added: new Date('1997-12-04T00:00:00.000Z'),
      // addedY: new Date('1997-12-04T00:10:00.000Z'),
    });
  });

  await tryRun("$term_highlight", async () => {
    const term = "abc81";
    const res = await db.various.find(
      { "hIdx.>": -2 }, 
      { select: { 
          h: { $term_highlight: [["name"], term, { }] },
          hFull: { $term_highlight: ["*", "81", { }] },
          hOrdered: { $term_highlight: [["name", "id"], "81", { }] },
          hIdx:  { $term_highlight: [["name"], term, { returnType: "index" }] },
          hBool:  { $term_highlight: [["name"], term, { returnType: "boolean" }] },
          hObj:  { $term_highlight: [["name"], term, { returnType: "object" }] },
          hObjAll:  { $term_highlight: ["*", term, { returnType: "object" }] },
        },
        orderBy: { hIdx: -1 } 
      }
    ); 
    // console.log(res[0])
    // console.log(res.map(r => JSON.stringify(r)).join("\n"));//, null, 2))  
    assert.deepStrictEqual(
      res[0], 
      {
        h:["name: ",["abc81"]," here"],

        /* Search all allowed fields using "*"  */
        hFull: [
          'id: 3, h: , name: abc',
          [ '81' ],
          ' here, tsv: , jsn: {"a":{"b":2}}, added: 1997-12-04 00:12:00'
        ],

        /* Search specific fields in specific order */
        hOrdered:["name: abc",["81"]," here, id: 3"],
        hIdx: 6, 
        hBool: true,
        hObj: {
          name: [
            '', ['abc81'],' here'
          ]
        },
        hObjAll: {
          name: [
            '', ['abc81'],' here'
          ]
        },
      }
    )
  });

  await tryRun("funcFilters: $term_highlight", async () => {
    const term = "abc81";
    const res = await db.various.count(
      { $term_highlight: [["*"], term, { returnType: "boolean" }] }
    );
    assert.equal(+res, 1)
  });

  await tryRunP("subscribe", async (resolve, reject) => {
    await db.various.insert({ id: 99 });
    const sub = await db.various.subscribe({ id: 99  }, {  }, async items => {
      const item = items[0];
      
      if(item && item.name === "zz3zz3"){
        await db.various.delete({ name: "zz3zz3" });
        sub.unsubscribe();
        resolve(true)
      }
    });
    await db.various.update({ id: 99 }, { name: "zz3zz1" });
    await db.various.update({ id: 99 }, { name: "zz3zz2" });
    await db.various.update({ id: 99 }, { name: "zz3zz3" });
  });

  await tryRunP("subscribeOne with throttle", async (resolve, reject) => {
    await db.various.insert({ id: 99 });
    const start = Date.now(); // name: "zz3zz" 
    const sub = await db.various.subscribeOne({ id: 99  }, { throttle: 1700 }, async item => {
      // const item = items[0]
      // console.log(item)

      const now = Date.now();
      if(item && item.name === "zz3zz2" &&  now - start > 1600 &&  now - start < 1800){
        await db.various.delete({ name: "zz3zz2" });
        sub.unsubscribe()
        resolve(true)
      }
    });
    await db.various.update({ id: 99 }, { name: "zz3zz1" });
    await db.various.update({ id: 99 }, { name: "zz3zz2" });
  });

  await tryRun("JSON filtering", async () => {
    const res = await db.various.count({ "jsn->a->>b": '3' });
    assert.equal(res, 1)
  });

  await tryRun("Complex filtering", async () => {
    const res = await db.various.count({ 
      $and: [
        { 
          $filter: [
            { $year: ["added"] },
            "=",
            '1996'
          ] 
        },
        { 
          $filter: [
            { $Mon: ["added"] },
            "=",
            'Dec'
          ] 
        }

      ]
    });
    assert.equal(res, 1)
  });

  await tryRun("template_string function", async () => {
    const res = await db.various.findOne({ name: 'abc9' }, { select: { tstr: { $template_string: ["{name} is hehe"] } } });
    const res2 = await db.various.findOne({ name: 'abc9' }, { select: { tstr: { $template_string: ["is hehe"] } } });
    assert.equal(res.tstr, "'abc9 is hehe'")
  });

  await tryRun("Between filtering", async () => {
    const res = await db.various.count({ 
      added: { $between: [
        new Date('06 Dec 1995 00:12:00 GMT'),
        new Date('03 Dec 1997 00:12:00 GMT')
      ] } });
    assert.equal(res, 1)
  });
  await tryRun("In filtering", async () => {
    const res = await db.various.count({ 
      added: { $in: [
        new Date('04 Dec 1996 00:12:00 GMT')
      ] } });
    assert.equal(res, 1)
  });

  await tryRun("Order by", async () => {
    const res = await db.items.find({}, { select: { name: 1 }, orderBy: [{ key: "name", asc: false, nulls: "first", nullEmpty: true }] });
    assert.deepStrictEqual(res, [{ name: 'b'}, { name: 'a'}, { name: 'a'}]);
  });

  await tryRun("Order by aliased func", async () => {
    const res = await db.items.find({ }, { select: { uname: { $upper: ["name"] }, count: { $countAll: [] } }, orderBy: { uname: -1 }});
    assert.deepStrictEqual(res, [{ uname: 'B', count: '1'}, { uname: 'A', count: '2'} ])
  });

  await tryRun("Order by aggregation", async () => {
    const res = await db.items.find({ }, { select: { name: 1, count: { $countAll: [] } }, orderBy: { count: -1 }});
    assert.deepStrictEqual(res, [  { name: 'a', count: '2'} , { name: 'b', count: '1'} ])
  });

  await tryRun("Order by colliding alias name", async () => {
    const res = await db.items.find({ }, { select: { name: { $countAll: [] }, n: { $left: ["name", 1]} }, orderBy: { name: -1 }});
    assert.deepStrictEqual(res, [  { name: '2', n: 'a' } , { name: '1', n: 'b'} ])
  });

  await tryRun("Update batch example", async () => {
    
    await db.items4.updateBatch([
      [{ name: "abc1" }, { name: "abc" }],
      [{ name: "abc2" }, { name: "abc" }]
    ]);
    assert.equal(await db.items4.count({ name: "abc" }), 2);
  })

  await tryRun("Function example", async () => {
  
    const f = await db.items4.findOne({}, { select: { public: 1, p_5: { $left: ["public", 3] } } });
    assert.equal(f.p_5.length, 3);
    assert.equal(f.p_5, f.public.substr(0, 3));

    // Nested function
    const fg = await db.items2.findOne({}, { select: { id: 1, name: 1, items3: { name: "$upper" } } });// { $upper: ["public"] } } });
    assert.deepStrictEqual(fg, { id: 1, name: 'a', items3: [ { name: 'A' } ] });

    // Date utils
    const Mon = await db.items4.findOne({ name: "abc" }, { select: { added: "$Mon" } });
    assert.deepStrictEqual(Mon, { added: "Dec" });

    // Date + agg
    const MonAgg = await db.items4.find({ name: "abc" }, { select: { added: "$Mon", public: "$count" } });
    assert.deepStrictEqual(MonAgg, [{ added: "Dec", public: '2' }]);

    // Returning
    const returningParam: Parameters<typeof db.items4_pub.insert>[1] = { returning: { id: 1, name: 1, public: 1 , $rowhash: 1, added_day: { "$day": ["added"] } }} ;  //   ctid: 1,
    let i = await db.items4_pub.insert( { name: "abc123", public: "public data", added: new Date('04 Dec 1995 00:12:00 GMT') }, returningParam);
    assert.deepStrictEqual(i, { id: 1,  name: 'abc123', public: 'public data', $rowhash: '347c26babad535aa697a794af89195fe', added_day: 'monday'  }); //  , ctid: '(0,1)'
  
    let u = await db.items4_pub.update( { name: "abc123" }, { public: "public data2" }, returningParam);
    assert.deepStrictEqual(u, [{ id: 1,  name: 'abc123', public: 'public data2', $rowhash: '9d18ddfbff9e13411d13f82d414644de', added_day: 'monday'  }]);
  
    let d = await db.items4_pub.delete( { name: "abc123" }, returningParam);
    assert.deepStrictEqual(d, [{ id: 1,  name: 'abc123', public: 'public data2', $rowhash: '9d18ddfbff9e13411d13f82d414644de', added_day: 'monday'  }]);
	
    console.log("TODO: socket.io stringifies dates")
  });

  await tryRun("JSONB filtering", async () => {
    const row = await db.obj_table.insert({obj: { propName: 3232 }}, { returning: "*" });
    const sameRow = await db.obj_table.findOne({obj: { propName: 3232 }});
    const count = await db.obj_table.count({obj: { propName: 3232 }});
    assert.deepStrictEqual(row, sameRow);
    assert.deepStrictEqual(+count, 1);
  })

  await tryRun("Postgis examples", async () => {
    await db.shapes.delete();
    const p1 = { ST_GeomFromText: ["POINT(-1 1)", 4326] },
      p2 = { ST_GeomFromText: ["POINT(-2 2)", 4326] };
    await db.shapes.insert([
      { geom: p1, geog: p1 },
      { geom: p2, geog: p2  },
    ])
  
    /** Basic functions and extent filters */
    const f = await db.shapes.findOne({ $and: [
      {"geom.&&.st_makeenvelope": [
        -3, 2,
        -2, 2
      ]},
      {"geog.&&.st_makeenvelope": [
        -3, 2,
        -2, 2
      ] }]
    }, { 
      select: {
        geomTxt: {"$ST_AsText": ["geom"]},
        geomGeo: {"$ST_AsGeoJSON": ["geom"]},
      },
      orderBy: "geom"
    });
    assert.deepStrictEqual(f, {
      geomGeo: {
        coordinates: [-2,2],
        type: 'Point'
      },
      geomTxt: 'POINT(-2 2)'
    });

    /**Aggregate functions */
    const aggs = await db.shapes.findOne({ }, { 
      select: {
        xMin: { "$ST_XMin_Agg": ["geom"] },
        xMax: { "$ST_XMax_Agg": ["geom"] },
        yMin: { "$ST_YMin_Agg": ["geom"] },
        yMax: { "$ST_YMax_Agg": ["geom"] },
        zMin: { "$ST_ZMin_Agg": ["geom"] },
        zMax: { "$ST_ZMax_Agg": ["geom"] },
        extent: { "$ST_Extent": ["geom"] },
        //  extent3D: { "$ST_3DExtent": ["geom"] },
      },
    });
    assert.deepStrictEqual(aggs, {
      xMax: -1,
      xMin: -2,
      yMax: 2,
      yMin: 1,
      zMax: 0,
      zMin: 0,
      extent: 'BOX(-2 1,-1 2)',
      //  extent3D: 'BOX3D(-2 1 0,-1 2 6.952908662134e-310)' <-- looks like a value that will fail tests at some point
    });

  });

  await tryRun("Local file upload", async () => {
    let str = "This is a string",
      data = Buffer.from(str, "utf-8"),
      mediaFile = { data, name: "sample_file.txt" }

    const file = await db.media.insert(mediaFile, { returning: "*" });
    const _data = fs.readFileSync(__dirname + "/server/media/"+file.name);
    assert.equal(str, _data.toString('utf8'));

    await tryRun("Nested insert", async () => {
  
      const { name, media: { extension, content_type, original_name } } = await db.items_with_one_media.insert({ name: "somename.txt", media: mediaFile }, { returning: "*" });
      
      assert.deepStrictEqual(
        { extension, content_type, original_name },
        {
          extension: 'txt',
          content_type: 'text/plain',
          original_name: 'sample_file.txt',
        }
      );
      // const _data = fs.readFileSync(__dirname + "/server/media/"+file.name);
      assert.equal(name, "somename.txt");
    });
  });

  
  await tryRun("Exists filter example", async () => {
  
    const fo = await db.items.findOne(),
      f = await db.items.find();
      
    assert.deepStrictEqual(fo,    { h: null, id: 1, name: 'a' }, "findOne query failed" );
    assert.deepStrictEqual(f[0],  { h: null, id: 1, name: 'a' }, "findOne query failed" );
  });

  await tryRun("Result size", async () => {
    const is75bits = await db.items.size({ 
    }, { select: { name: 1 } });
    assert.equal(is75bits, '75', "Result size query failed")
  });

  await tryRun("Basic exists", async () => {
    const expect0 = await db.items.count({ 
      $and: [
        { $exists: { items2: { name: "a" } } },
        { $exists: { items3: { name: "b" } } },
      ]
    });
    assert.equal(expect0, 0, "$exists query failed")
  });
  
  await tryRun("Basic fts with shorthand notation", async () => {
    const res = await db.items.count({ 
      $and: [
        { $exists: { items2: { "name.@@.to_tsquery": ["a"] } } },
        { $exists: { items3: { "name.@@.to_tsquery": ["b"] } } },
      ]
    });
    // assert.deepStrictEqual(res, { name: 'a'})
    assert.equal(res, 0, "FTS query failed")
  });

  await tryRun("Exists with shortest path wildcard filter example", async () => {
    const expect2 = await db.items.find({ 
      $and: [
        { $existsJoined: { "**.items3": { name: "a" } } },
        { $existsJoined: { items2: { name: "a" } } }
      ]
    });
    assert.equal(expect2.length, 2, "$existsJoined query failed");
  });
     

  await tryRun("Exists with exact path filter example", async () => {
    const _expect2 = await db.items.find({ 
      $and: [
        // { "items2": { name: "a" } },
        // { "items2.items3": { name: "a" } },
        { $existsJoined: { items2: { name: "a" } } }
      ] 
    });
    assert.equal(_expect2.length, 2, "$existsJoined query failed");
  });

  await tryRun("Not Exists with exact path filter example", async () => {
    const _expect1 = await db.items.find({ 
      $and: [
        // { "items2": { name: "a" } },
        // { "items2.items3": { name: "a" } },
        { $notExistsJoined: { items2: { name: "a" } } }
      ] 
    });
    assert.equal(_expect1.length, 1, "$notExistsJoined query failed");
  });

  /* Upsert */
  await tryRun("Upsert example", async () => {
    await db.items.upsert({ name: "tx" }, { name: "tx" });
    await db.items.upsert({ name: "tx" }, { name: "tx" });
    assert.equal(await db.items.count({ name: "tx" }), 1, "upsert command failed");
  });

  /* Joins example */
  await tryRun("Joins example", async () => {
    const items = await db.items.find({}, {
      select: {
        "*": 1,
        items3: "*",
        items22: db.leftJoin.items2({}, "*")
      }
    });
    
    if(!items.length || !items.every(it => Array.isArray(it.items3) && Array.isArray(it.items22))){
      console.log(items[0].items3)
      throw "Joined select query failed";
    }
  });

  /* Joins duplicate table example */
  await tryRun("Joins repeating table example", async () => {
    const items2 = await db.items.find({}, {
      select: {
        "*": 1,
        items2: "*"
      }
    });
    const items2j = await db.items.find({}, {
      select: {
        "*": 1,
        items2: "*",
        items2j: db.leftJoin.items2({}, "*")
      }
    });
    
    items2.forEach((d, i)=> {
      assert.deepStrictEqual(d.items2, items2j[i].items2, "Joins duplicate aliased table query failed");
      assert.deepStrictEqual(d.items2, items2j[i].items2j, "Joins duplicate aliased table query failed");
    });
  });
  
  
  
  await tryRun("Join aggregate functions example", async () => {
    const singleShortHandAgg = await db.items.findOne(
      {},
      { select: { id: "$max" }}
    );
    const singleAgg = await db.items.findOne(
      {},
      { select: { id: { "$max": ["id"] } }}
    );
    assert.deepStrictEqual(singleShortHandAgg, { id: 4 });
    assert.deepStrictEqual(singleAgg, { id: 4 });

    const shortHandAggJoined = await db.items.findOne(
      { id: 4 },
      { select: { id: 1, items2: { name: "$max" } }}
    );
    assert.deepStrictEqual(shortHandAggJoined, { id: 4, items2: [] });
  });



  /* $rowhash -> Custom column that returms md5(ctid + allowed select columns). Used in joins & CRUD to bypass PKey details */
  await tryRun("$rowhash example", async () => {
    const rowhash = await db.items.findOne({}, { select: { $rowhash: 1, "*": 1 }});
    const f = { $rowhash: rowhash.$rowhash };
    const rowhashView = await db.v_items.findOne({}, { select: { $rowhash: 1 }});
    const rh1 = await db.items.findOne({ $rowhash: rowhash.$rowhash }, { select: { $rowhash: 1 }});
    const rhView = await db.v_items.findOne({ $rowhash: rowhashView.$rowhash }, { select: { $rowhash: 1 }});
    // console.log({ rowhash, f });

    await db.items.update(f, { name: 'a' });
    
    // console.log(rowhash, rh1)
    // console.log(rowhashView, rhView)
    if(
      typeof rowhash.$rowhash !== "string" || 
      typeof rowhashView.$rowhash !== "string" ||
      rowhash.$rowhash !== rh1.$rowhash ||
      rowhashView.$rowhash !== rhView.$rowhash
    ){ 
      throw "$rowhash query failed";
    }
  });
}