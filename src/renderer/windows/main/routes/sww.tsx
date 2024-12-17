import logo from '../../../assets/passlogo-small.png';

export const SomethingWentWrong = () => {
  return (
    <div className='bg-white p-8 rounded-2xl shadow-xl border border-[#1A1617]/5 text-center'>
      <img src={logo} alt='logo' className='mx-auto w-16 h-16 mb-6' />
      <h1 className='text-3xl font-bold text-[#C9121F] mb-4'>Something Went Wrong</h1>
      <p className='text-[#1A1617]/70 mb-6'>
        We've encountered an unexpected error. Our IT staff has been notified and will resolve this issue shortly.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className='mt-4 w-full py-3 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl'
      >
        Try Again
      </button>
    </div>
  );
}