<script>
  import { onMount } from "svelte"
  import TabulatorTable from "../components/TabulatorTable.svelte";
  import {getQueus} from '../api/queueApi'
  //  import Tab, { Label } from '@smui/tab';
  // import TabBar from '@smui/tab-bar';

  // let active = $state('Home');
  
  onMount(()=>{
    console.log('ready to call API')
    getQueus().then((res)=>{
      console.log('RES =>', res)
    }
  )
  })
</script>
 
<div>

  <TabulatorTable></TabulatorTable>
  <!-- <TabBar tabs={['Home', 'Merchandise', 'About Us']} bind:active>
    {#snippet tab(tab)}
      <Tab {tab} minWidth>
        <Label>{tab}</Label>
      </Tab>
    {/snippet}
  </TabBar> -->

</div>

   

