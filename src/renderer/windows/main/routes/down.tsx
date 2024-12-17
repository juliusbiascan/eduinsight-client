import logo from '../../../assets/passlogo-small.png';

const ServerDown = () => {
  return (
    <div className='bg-white p-8 rounded-2xl shadow-xl border border-[#1A1617]/5 text-center'>
      <img src={logo} alt='logo' className='mx-auto w-16 h-16 mb-6' />
      <h1 className='text-3xl font-bold text-[#EBC42E] mb-4'>We'll Be Right Back!</h1>
      <p className='text-[#1A1617]/70 mb-6'>
        Our server is currently undergoing maintenance. We'll be back online shortly.
      </p>
      <div className='bg-[#EBC42E]/10 p-4 rounded-xl'>
        <p className='text-[#1A1617] font-semibold'>
          Estimated downtime: 30 minutes
        </p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className='mt-6 w-full py-3 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl'
      >
        Refresh Page
      </button>
    </div>
  );
}

export default ServerDown;
