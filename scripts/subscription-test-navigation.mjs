// Exercise the carousel's public keyboard alternative after removing pagination.
export const tierNavigation = index => `(() => {
    const track=document.querySelector('.membership-carousel');
    for (const key of ${JSON.stringify(index === 0 ? ['Home'] : index === 2 ? ['End'] : ['Home','ArrowLeft'])}) {
        track.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
    }
})()`;
