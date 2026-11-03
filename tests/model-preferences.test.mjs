import test from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../supabase/functions/model-preferences/validation.mjs';
const valid=()=>({id:crypto.randomUUID(),invite:'a'.repeat(64),name:'Test',note:'',interests:['Runway'],talents:['DJ']});
test('preferences accepts bounded optional answers',()=>{assert.equal(validate(valid()),true);assert.equal(validate({...valid(),interests:[],talents:[]}),true);});
test('preferences rejects malformed capability, identity, and oversized or structured answers',()=>{const b=valid();for(const bad of [null,{...b,name:''},{...b,name:'a'.repeat(101)},{...b,note:'a'.repeat(1001)},{...b,interests:[{}]},{...b,talents:Array(31).fill('DJ')},{...b,invite:'bad'},{...b,id:'bad'}])assert.equal(validate(bad),false);});
