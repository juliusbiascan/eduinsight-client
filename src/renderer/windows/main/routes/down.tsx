import logo from '../../../assets/passlogo-small.png';

const ServerDown = () => {
  return (
    <div className='bg-white p-8 rounded-2xl shadow-xl border border-[#1A1617]/5 text-center'>
      <img src={logo} alt='logo' className='mx-auto w-16 h-16 mb-6' />
      <h1 className='text-3xl font-bold text-[#EBC42E] mb-4'>We'll Be Right Back!</h1>
      <p className='text-[#1A1617]/70 mb-6'>
        Our server is currently undergoing maintenance. We'll be back online shortly.
      </p>
    </div>
  );
}

export default ServerDown;
